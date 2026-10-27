/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { FluxOciRepositorySpec } from "../common/flux-resources";
import { FluxOciRepository, fluxOciRepositoriesDescriptor } from "../common/flux-resources";
import { fluxOciRepositoriesRoutes } from "../common/flux-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { FluxConditions, getFluxColumns, getFluxDetails, getSourceColumns, getSourceDetails } from "./flux-view-helpers";
import fluxSidebarGroupInjectable from "./flux-sidebar-group.injectable";

/**
 * The most specific reference wins: digest, semver and finally tag
 */
const formatRef = (ref: FluxOciRepositorySpec["ref"]) => {
  if (ref?.digest) {
    return `digest ${ref.digest}`;
  }

  if (ref?.semver) {
    return `semver ${ref.semver}`;
  }

  // Flux defaults to the "latest" tag
  return `tag ${ref?.tag ?? "latest"}`;
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<FluxOciRepository>({
  descriptor: fluxOciRepositoriesDescriptor,
  objectConstructor: FluxOciRepository,
  routes: fluxOciRepositoriesRoutes,
  sidebar: {
    parentId: fluxSidebarGroupInjectable.id,
    orderNumber: 40,
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
      id: "ref",
      title: "Ref",
      value: repository => formatRef(repository.spec.ref),
      search: repository => formatRef(repository.spec.ref),
    },
    ...getSourceColumns<FluxOciRepository>(),
    ...getFluxColumns<FluxOciRepository>(),
  ],
  details: [
    ...getFluxDetails<FluxOciRepository>(),
    {
      name: "URL",
      value: repository => repository.spec.url,
    },
    {
      name: "Ref",
      value: repository => formatRef(repository.spec.ref),
    },
    {
      name: "SemVer Filter",
      value: repository => repository.spec.ref?.semverFilter,
      hidden: repository => !repository.spec.ref?.semverFilter,
    },
    {
      name: "Layer Selector",
      value: ({ spec: { layerSelector }}) => [
        layerSelector?.mediaType,
        layerSelector?.operation && `(${layerSelector.operation})`,
      ].filter(Boolean).join(" "),
      hidden: repository => !repository.spec.layerSelector,
    },
    {
      name: "Provider",
      value: repository => repository.spec.provider ?? "generic",
    },
    {
      name: "Secret",
      value: repository => repository.spec.secretRef && (
        <ObjectReferenceLink parent={repository} reference={{ kind: "Secret", group: "", name: repository.spec.secretRef.name }} />
      ),
      hidden: repository => !repository.spec.secretRef,
    },
    {
      name: "Service Account",
      value: repository => repository.spec.serviceAccountName,
      hidden: repository => !repository.spec.serviceAccountName,
    },
    {
      name: "Insecure",
      value: repository => repository.spec.insecure ? "Yes" : "No",
      hidden: repository => !repository.spec.insecure,
    },
    ...getSourceDetails<FluxOciRepository>(),
  ],
  DetailsComponent: FluxConditions,

  // Rendered by FluxConditions, with the polarity of the Flux condition types
  getConditions: () => undefined,
}));
