/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { ReferenceGrant, referenceGrantsDescriptor } from "../common/gateway-api-resources";
import { referenceGrantsRoutes } from "../common/gateway-api-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import gatewayApiSidebarGroupInjectable from "./gateway-api-sidebar-group.injectable";

const formatGroupKind = ({ group, kind }: { group: string; kind: string }) => (
  group ? `${kind}.${group}` : kind
);

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ReferenceGrant>({
  descriptor: referenceGrantsDescriptor,
  objectConstructor: ReferenceGrant,
  routes: referenceGrantsRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 80,
  },
  columns: [
    {
      id: "from",
      title: "From",
      size: "wide",
      value: grant => grant.spec.from.map(from => `${from.namespace}/${formatGroupKind(from)}`).join(", "),
      search: grant => grant.spec.from.map(from => from.namespace),
    },
    {
      id: "to",
      title: "To",
      size: "wide",
      value: grant => grant.spec.to.map(to => `${formatGroupKind(to)}${to.name ? `/${to.name}` : ""}`).join(", "),
    },
  ],
  DetailsComponent: ({ object: grant }) => (
    <>
      <ResourceTable
        title="From"
        rows={grant.spec.from}
        columns={[
          { title: "Namespace", value: from => from.namespace },
          { title: "Kind", value: formatGroupKind },
        ]}
      />
      <ResourceTable
        title="To"
        rows={grant.spec.to}
        columns={[
          { title: "Kind", value: formatGroupKind },
          { title: "Name", value: to => to.name ?? "*" },
        ]}
      />
    </>
  ),
}));
