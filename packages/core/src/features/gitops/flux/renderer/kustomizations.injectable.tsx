/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { isDefined } from "@k8slens/utilities";
import { FluxKustomization, fluxKustomizationsDescriptor, fluxKustomizeGroup } from "../common/flux-resources";
import { fluxKustomizationsRoutes } from "../common/flux-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { shortenRevision } from "../../renderer/gitops-view-helpers";
import {
  DependsOnLinks,
  FluxConditions,
  FluxObjectReferenceLink,
  getFluxColumns,
  getFluxDetails,
  parseInventoryEntry,
} from "./flux-view-helpers";
import fluxSidebarGroupInjectable from "./flux-sidebar-group.injectable";

const getInventory = (kustomization: FluxKustomization) => (
  kustomization.status?.inventory?.entries?.map(parseInventoryEntry).filter(isDefined) ?? []
);

const KustomizationDetails = ({ object: kustomization }: { object: FluxKustomization }) => {
  const inventory = getInventory(kustomization);

  return (
    <>
      <FluxConditions object={kustomization} />
      <ResourceTable
        title={`Inventory (${inventory.length})`}
        rows={inventory}
        columns={[
          { title: "Kind", value: entry => entry.kind },
          { title: "Namespace", value: entry => entry.namespace },
          {
            title: "Name",
            className: "wide",
            value: entry => (
              <ObjectReferenceLink
                parent={kustomization}
                reference={{ kind: entry.kind, group: entry.group, name: entry.name, namespace: entry.namespace }}
              />
            ),
          },
          { title: "API Version", value: entry => entry.group ? `${entry.group}/${entry.version}` : entry.version },
        ]}
      />
    </>
  );
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<FluxKustomization>({
  descriptor: fluxKustomizationsDescriptor,
  objectConstructor: FluxKustomization,
  routes: fluxKustomizationsRoutes,
  sidebar: {
    parentId: fluxSidebarGroupInjectable.id,
    orderNumber: 10,
  },
  columns: [
    {
      id: "source",
      title: "Source",
      size: "wide",
      value: kustomization => <FluxObjectReferenceLink reference={kustomization.spec.sourceRef} parent={kustomization} />,
      sortBy: kustomization => kustomization.spec.sourceRef.name,
      search: kustomization => kustomization.spec.sourceRef.name,
    },
    {
      id: "path",
      title: "Path",
      value: kustomization => kustomization.spec.path,
      sortBy: kustomization => kustomization.spec.path,
      search: kustomization => kustomization.spec.path,
    },
    {
      id: "revision",
      title: "Revision",
      value: kustomization => shortenRevision(kustomization.status?.lastAppliedRevision),
      search: kustomization => kustomization.status?.lastAppliedRevision,
    },
    ...getFluxColumns<FluxKustomization>(),
  ],
  details: [
    ...getFluxDetails<FluxKustomization>(),
    {
      name: "Source",
      value: kustomization => <FluxObjectReferenceLink reference={kustomization.spec.sourceRef} parent={kustomization} />,
    },
    {
      name: "Path",
      value: kustomization => kustomization.spec.path ?? "./",
    },
    {
      name: "Prune",
      value: kustomization => kustomization.spec.prune ? "Yes" : "No",
    },
    {
      name: "Target Namespace",
      value: kustomization => kustomization.spec.targetNamespace,
      hidden: kustomization => !kustomization.spec.targetNamespace,
    },
    {
      name: "Service Account",
      value: kustomization => kustomization.spec.serviceAccountName,
      hidden: kustomization => !kustomization.spec.serviceAccountName,
    },
    {
      name: "Last Applied Revision",
      value: kustomization => kustomization.status?.lastAppliedRevision,
      hidden: kustomization => !kustomization.status?.lastAppliedRevision,
    },
    {
      name: "Last Attempted Revision",
      value: kustomization => kustomization.status?.lastAttemptedRevision,
      hidden: kustomization => !kustomization.status?.lastAttemptedRevision
        || kustomization.status.lastAttemptedRevision === kustomization.status.lastAppliedRevision,
    },
    {
      name: "Depends On",
      value: kustomization => (
        <DependsOnLinks
          dependencies={kustomization.spec.dependsOn}
          parent={kustomization}
          kind="Kustomization"
          group={fluxKustomizeGroup}
        />
      ),
      hidden: kustomization => !kustomization.spec.dependsOn?.length,
    },
  ],
  DetailsComponent: KustomizationDetails,

  // Rendered by KustomizationDetails, with the polarity of the Flux condition types
  getConditions: () => undefined,
}));
