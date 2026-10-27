/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { FluxGitRepositorySpec } from "../common/flux-resources";
import { FluxGitRepository, fluxGitRepositoriesDescriptor } from "../common/flux-resources";
import { fluxGitRepositoriesRoutes } from "../common/flux-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { FluxConditions, getFluxColumns, getFluxDetails, getSourceColumns, getSourceDetails } from "./flux-view-helpers";
import fluxSidebarGroupInjectable from "./flux-sidebar-group.injectable";

/**
 * The most specific reference wins: commit, name, semver, tag and finally branch
 */
const formatRef = (ref: FluxGitRepositorySpec["ref"]) => {
  if (ref?.commit) {
    return `commit ${ref.commit}`;
  }

  if (ref?.name) {
    return ref.name;
  }

  if (ref?.semver) {
    return `semver ${ref.semver}`;
  }

  if (ref?.tag) {
    return `tag ${ref.tag}`;
  }

  // Flux defaults to the "master" branch
  return `branch ${ref?.branch ?? "master"}`;
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<FluxGitRepository>({
  descriptor: fluxGitRepositoriesDescriptor,
  objectConstructor: FluxGitRepository,
  routes: fluxGitRepositoriesRoutes,
  sidebar: {
    parentId: fluxSidebarGroupInjectable.id,
    orderNumber: 30,
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
    ...getSourceColumns<FluxGitRepository>(),
    ...getFluxColumns<FluxGitRepository>(),
  ],
  details: [
    ...getFluxDetails<FluxGitRepository>(),
    {
      name: "URL",
      value: repository => repository.spec.url,
    },
    {
      name: "Ref",
      value: repository => formatRef(repository.spec.ref),
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
      name: "Recurse Submodules",
      value: repository => repository.spec.recurseSubmodules ? "Yes" : "No",
      hidden: repository => repository.spec.recurseSubmodules === undefined,
    },
    {
      name: "Verification",
      value: repository => repository.spec.verify?.mode ?? "HEAD",
      hidden: repository => !repository.spec.verify,
    },
    ...getSourceDetails<FluxGitRepository>(),
  ],
  DetailsComponent: ({ object: repository }) => (
    <>
      <FluxConditions object={repository} />
      <ResourceTable
        title="Includes"
        rows={repository.spec.include}
        columns={[
          {
            title: "Repository",
            className: "wide",
            value: include => (
              <ObjectReferenceLink
                parent={repository}
                reference={{ kind: "GitRepository", group: fluxGitRepositoriesDescriptor.group, name: include.repository.name }}
              />
            ),
          },
          { title: "From Path", value: include => include.fromPath ?? "./" },
          { title: "To Path", value: include => include.toPath ?? include.repository.name },
        ]}
      />
    </>
  ),

  // Rendered by the details component, with the polarity of the Flux condition types
  getConditions: () => undefined,
}));
