/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { ArgoGroupKind } from "../common/argo-cd-resources";
import { ArgoAppProject, argoAppProjectsDescriptor } from "../common/argo-cd-resources";
import { argoAppProjectsRoutes } from "../common/argo-cd-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { StatusBadge } from "../../../resource-views/renderer/components/status-badge";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { formatGroupKind } from "./argo-cd-view-helpers";
import argoCdSidebarGroupInjectable from "./argo-cd-sidebar-group.injectable";

const formatGroupKinds = (groupKinds: ArgoGroupKind[] | undefined) => (
  groupKinds?.map(formatGroupKind).join(", ")
);

const getDestinationCount = (project: ArgoAppProject) => project.spec.destinations?.length ?? 0;
const getClusterResourceWhitelistCount = (project: ArgoAppProject) => project.spec.clusterResourceWhitelist?.length ?? 0;
const getRoleCount = (project: ArgoAppProject) => project.spec.roles?.length ?? 0;

const AppProjectDetails = ({ object: project }: { object: ArgoAppProject }) => (
  <>
    <ResourceTable
      title="Destinations"
      rows={project.spec.destinations}
      columns={[
        { title: "Cluster", className: "wide", value: destination => destination.name ?? destination.server },
        { title: "Namespace", value: destination => destination.namespace },
      ]}
    />
    <ResourceTable
      title="Roles"
      rows={project.spec.roles}
      columns={[
        { title: "Name", value: role => role.name },
        { title: "Description", className: "wide", value: role => role.description },
        { title: "Policies", className: "narrow", value: role => role.policies?.length ?? 0 },
        { title: "Groups", value: role => role.groups?.join(", ") },
      ]}
    />
    <ResourceTable
      title="Sync Windows"
      rows={project.spec.syncWindows}
      columns={[
        {
          title: "Kind",
          className: "narrow",
          value: window => <StatusBadge tone={window.kind === "deny" ? "warning" : "success"} label={window.kind} />,
        },
        { title: "Schedule", value: window => [window.schedule, window.timeZone].filter(Boolean).join(" ") },
        { title: "Duration", className: "narrow", value: window => window.duration },
        {
          title: "Applies To",
          className: "wide",
          value: window => [
            ...(window.applications ?? []),
            ...(window.namespaces?.map(namespace => `namespace ${namespace}`) ?? []),
            ...(window.clusters?.map(cluster => `cluster ${cluster}`) ?? []),
          ].join(", "),
        },
        { title: "Manual Sync", className: "narrow", value: window => window.manualSync ? "Yes" : "No" },
      ]}
    />
  </>
);

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ArgoAppProject>({
  descriptor: argoAppProjectsDescriptor,
  objectConstructor: ArgoAppProject,
  routes: argoAppProjectsRoutes,
  sidebar: {
    parentId: argoCdSidebarGroupInjectable.id,
    orderNumber: 30,
  },
  columns: [
    {
      id: "description",
      title: "Description",
      size: "wide",
      value: project => project.spec.description,
      search: project => project.spec.description,
    },
    {
      id: "source-repos",
      title: "Source Repositories",
      size: "wide",
      value: project => project.spec.sourceRepos?.join(", "),
      search: project => project.spec.sourceRepos,
    },
    {
      id: "destinations",
      title: "Destinations",
      size: "narrow",
      value: getDestinationCount,
      sortBy: getDestinationCount,
    },
    {
      id: "cluster-resources",
      title: "Cluster Resources",
      size: "narrow",
      value: getClusterResourceWhitelistCount,
      sortBy: getClusterResourceWhitelistCount,
    },
    {
      id: "roles",
      title: "Roles",
      size: "narrow",
      value: getRoleCount,
      sortBy: getRoleCount,
    },
  ],
  details: [
    {
      name: "Description",
      value: project => project.spec.description,
      hidden: project => !project.spec.description,
    },
    {
      name: "Source Repositories",
      value: project => project.spec.sourceRepos?.map(repo => <div key={repo}>{repo}</div>),
      hidden: project => !project.spec.sourceRepos?.length,
    },
    {
      name: "Source Namespaces",
      value: project => project.spec.sourceNamespaces?.join(", "),
      hidden: project => !project.spec.sourceNamespaces?.length,
    },
    {
      name: "Cluster Resources Allowed",
      value: project => formatGroupKinds(project.spec.clusterResourceWhitelist),
      hidden: project => !project.spec.clusterResourceWhitelist?.length,
    },
    {
      name: "Cluster Resources Denied",
      value: project => formatGroupKinds(project.spec.clusterResourceBlacklist),
      hidden: project => !project.spec.clusterResourceBlacklist?.length,
    },
    {
      name: "Namespace Resources Allowed",
      value: project => formatGroupKinds(project.spec.namespaceResourceWhitelist),
      hidden: project => !project.spec.namespaceResourceWhitelist?.length,
    },
    {
      name: "Namespace Resources Denied",
      value: project => formatGroupKinds(project.spec.namespaceResourceBlacklist),
      hidden: project => !project.spec.namespaceResourceBlacklist?.length,
    },
    {
      name: "Signature Keys",
      value: project => project.spec.signatureKeys?.map(key => key.keyID).join(", "),
      hidden: project => !project.spec.signatureKeys?.length,
    },
  ],
  DetailsComponent: AppProjectDetails,
}));
