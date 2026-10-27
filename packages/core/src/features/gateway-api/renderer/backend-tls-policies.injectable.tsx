/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { BackendTLSPolicy, backendTlsPoliciesDescriptor } from "../common/gateway-api-resources";
import { backendTlsPoliciesRoutes } from "../common/gateway-api-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../resource-views/renderer/components/object-reference-link";
import { ConditionBadges } from "../../resource-views/renderer/components/resource-conditions";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { formatParentRef, ParentRefLink } from "./route-view-helpers";
import gatewayApiSidebarGroupInjectable from "./gateway-api-sidebar-group.injectable";

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<BackendTLSPolicy>({
  descriptor: backendTlsPoliciesDescriptor,
  objectConstructor: BackendTLSPolicy,
  routes: backendTlsPoliciesRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 90,
  },
  columns: [
    {
      id: "targets",
      title: "Targets",
      size: "wide",
      value: policy => policy.spec.targetRefs.map(ref => `${ref.kind ?? "Service"}/${ref.name}`).join(", "),
      search: policy => policy.spec.targetRefs.map(ref => ref.name),
    },
    {
      id: "hostname",
      title: "Hostname",
      value: policy => policy.spec.validation.hostname,
      sortBy: policy => policy.spec.validation.hostname,
      search: policy => policy.spec.validation.hostname,
    },
  ],
  details: [
    {
      name: "Hostname",
      value: policy => policy.spec.validation.hostname,
    },
    {
      name: "CA Certificates",
      value: policy => policy.spec.validation.wellKnownCACertificates
        ?? policy.spec.validation.caCertificateRefs?.map(ref => `${ref.kind ?? "ConfigMap"}/${ref.name}`).join(", "),
    },
    {
      name: "Subject Alt Names",
      value: policy => policy.spec.validation.subjectAltNames?.map(san => san.hostname ?? san.uri).join(", "),
      hidden: policy => !policy.spec.validation.subjectAltNames?.length,
    },
  ],
  DetailsComponent: ({ object: policy }) => (
    <>
      <ResourceTable
        title="Targets"
        rows={policy.spec.targetRefs}
        columns={[
          {
            title: "Target",
            value: ref => (
              <ObjectReferenceLink
                parent={policy}
                showKind
                reference={{ kind: ref.kind ?? "Service", group: ref.group ?? "", name: ref.name }}
              />
            ),
          },
          { title: "Section", value: ref => ref.sectionName },
        ]}
      />
      <ResourceTable
        title="Ancestors"
        rows={policy.status?.ancestors}
        columns={[
          { title: "Ancestor", value: ancestor => <ParentRefLink reference={ancestor.ancestorRef} parent={policy} /> },
          { title: "Section", value: ancestor => formatParentRef(ancestor.ancestorRef) },
          { title: "Status", value: ancestor => <ConditionBadges conditions={ancestor.conditions} /> },
        ]}
      />
    </>
  ),
}));
