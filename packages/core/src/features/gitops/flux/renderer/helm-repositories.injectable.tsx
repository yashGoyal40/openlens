/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { FluxHelmRepository, fluxHelmRepositoriesDescriptor } from "../common/flux-resources";
import { fluxHelmRepositoriesRoutes } from "../common/flux-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { FluxConditions, getFluxColumns, getFluxDetails, getSourceColumns, getSourceDetails } from "./flux-view-helpers";
import fluxSidebarGroupInjectable from "./flux-sidebar-group.injectable";

const getType = (repository: FluxHelmRepository) => repository.spec.type ?? "default";

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<FluxHelmRepository>({
  descriptor: fluxHelmRepositoriesDescriptor,
  objectConstructor: FluxHelmRepository,
  routes: fluxHelmRepositoriesRoutes,
  sidebar: {
    parentId: fluxSidebarGroupInjectable.id,
    orderNumber: 50,
  },
  columns: [
    {
      id: "url",
      title: "URL",
      size: "wide",
      value: repository => repository.spec.url,
      sortBy: repository => repository.spec.url,
      search: repository => repository.spec.url,
    },
    {
      id: "type",
      title: "Type",
      size: "narrow",
      value: getType,
      sortBy: getType,
    },
    ...getSourceColumns<FluxHelmRepository>(),
    ...getFluxColumns<FluxHelmRepository>(),
  ],
  details: [
    ...getFluxDetails<FluxHelmRepository>(),
    {
      name: "URL",
      value: repository => repository.spec.url,
    },
    {
      name: "Type",
      value: getType,
    },
    {
      name: "Provider",
      value: repository => repository.spec.provider,
      hidden: repository => !repository.spec.provider,
    },
    {
      name: "Secret",
      value: repository => repository.spec.secretRef && (
        <ObjectReferenceLink parent={repository} reference={{ kind: "Secret", group: "", name: repository.spec.secretRef.name }} />
      ),
      hidden: repository => !repository.spec.secretRef,
    },
    {
      name: "Pass Credentials",
      value: repository => repository.spec.passCredentials ? "Yes" : "No",
      hidden: repository => !repository.spec.passCredentials,
    },
    {
      name: "Insecure",
      value: repository => repository.spec.insecure ? "Yes" : "No",
      hidden: repository => !repository.spec.insecure,
    },
    ...getSourceDetails<FluxHelmRepository>(),
  ],
  DetailsComponent: FluxConditions,

  // Rendered by FluxConditions, with the polarity of the Flux condition types
  getConditions: () => undefined,
}));
