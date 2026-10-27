/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { ArgoApplicationSetGenerator } from "../common/argo-cd-resources";
import { ArgoApplicationSet, argoApplicationSetsDescriptor, argoCdGroup } from "../common/argo-cd-resources";
import { argoApplicationSetsRoutes } from "../common/argo-cd-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { getPrimaryCondition, ResourceConditions } from "../../../resource-views/renderer/components/resource-conditions";
import { StatusBadge, toneForStatus } from "../../../resource-views/renderer/components/status-badge";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { TimeAgo } from "../../renderer/gitops-view-helpers";
import { formatDestination, formatSources, getSources, HealthStatusBadge, SyncStatusBadge } from "./argo-cd-view-helpers";
import argoCdSidebarGroupInjectable from "./argo-cd-sidebar-group.injectable";

/**
 * Formats e.g. `{ matrix: { generators: [{ git: {} }, { clusters: {} }] } }` as "matrix(git, clusters)"
 */
const formatGenerator = (generator: ArgoApplicationSetGenerator): string => {
  const type = Object.keys(generator).find(key => key !== "selector") ?? "unknown";
  const nested = generator.matrix?.generators ?? generator.merge?.generators;

  return nested
    ? `${type}(${nested.map(formatGenerator).join(", ")})`
    : type;
};

const getGeneratorTypes = (applicationSet: ArgoApplicationSet) => (
  applicationSet.spec.generators?.map(formatGenerator) ?? []
);

const getApplicationCount = (applicationSet: ArgoApplicationSet) => (
  applicationSet.status?.resourcesCount ?? applicationSet.status?.resources?.length ?? 0
);

const ApplicationSetStatusBadge = ({ applicationSet }: { applicationSet: ArgoApplicationSet }) => {
  const conditions = applicationSet.status?.conditions;
  const error = getPrimaryCondition(conditions, ["ErrorOccurred"]);
  const upToDate = getPrimaryCondition(conditions, ["ResourcesUpToDate"]);

  if (error?.status === "True") {
    return (
      <StatusBadge
        tone="error"
        label={error.reason ?? "Error"}
        tooltip={error.message}
      />
    );
  }

  if (!upToDate) {
    return <StatusBadge tone="vague" label="Unknown" />;
  }

  return (
    <StatusBadge
      tone={toneForStatus(upToDate.status)}
      label={upToDate.status === "True" ? "Up to date" : upToDate.reason ?? "Not up to date"}
      tooltip={upToDate.message}
    />
  );
};

const ApplicationSetDetails = ({ object: applicationSet }: { object: ArgoApplicationSet }) => (
  <>
    <ResourceConditions
      conditions={applicationSet.status?.conditions}
      negativePolarityTypes={["ErrorOccurred"]}
    />
    <ResourceTable
      title="Applications"
      rows={applicationSet.status?.resources}
      columns={[
        {
          title: "Name",
          className: "wide",
          value: resource => (
            <ObjectReferenceLink
              parent={applicationSet}
              reference={{
                kind: resource.kind,
                group: resource.group ?? argoCdGroup,
                name: resource.name,
                namespace: resource.namespace,
              }}
            />
          ),
        },
        { title: "Sync", value: resource => <SyncStatusBadge status={resource.status} /> },
        { title: "Health", value: resource => <HealthStatusBadge health={resource.health} /> },
      ]}
    />
    <ResourceTable
      title="Progressive Sync"
      rows={applicationSet.status?.applicationStatus}
      columns={[
        { title: "Application", value: status => status.application },
        { title: "Step", className: "narrow", value: status => status.step },
        { title: "Status", value: status => <StatusBadge tone={toneForStatus(status.status)} label={status.status} /> },
        { title: "Message", className: "wide", value: status => status.message },
        { title: "Last Transition", value: status => <TimeAgo timestamp={status.lastTransitionTime} /> },
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
} = createResourceViewInjectables(defineResourceView<ArgoApplicationSet>({
  descriptor: argoApplicationSetsDescriptor,
  objectConstructor: ArgoApplicationSet,
  routes: argoApplicationSetsRoutes,
  sidebar: {
    parentId: argoCdSidebarGroupInjectable.id,
    orderNumber: 20,
  },
  columns: [
    {
      id: "generators",
      title: "Generators",
      size: "wide",
      value: applicationSet => getGeneratorTypes(applicationSet).join(", "),
      search: getGeneratorTypes,
    },
    {
      id: "project",
      title: "Project",
      value: applicationSet => applicationSet.spec.template?.spec?.project,
      sortBy: applicationSet => applicationSet.spec.template?.spec?.project,
      search: applicationSet => applicationSet.spec.template?.spec?.project,
    },
    {
      id: "applications",
      title: "Applications",
      size: "narrow",
      value: getApplicationCount,
      sortBy: getApplicationCount,
    },
    {
      id: "status",
      title: "Status",
      value: applicationSet => <ApplicationSetStatusBadge applicationSet={applicationSet} />,
    },
  ],
  details: [
    {
      name: "Generators",
      value: applicationSet => getGeneratorTypes(applicationSet).join(", "),
    },
    {
      name: "Template Name",
      value: applicationSet => applicationSet.spec.template?.metadata?.name,
      hidden: applicationSet => !applicationSet.spec.template?.metadata?.name,
    },
    {
      name: "Project",
      value: applicationSet => applicationSet.spec.template?.spec?.project,
      hidden: applicationSet => !applicationSet.spec.template?.spec?.project,
    },
    {
      name: "Source",
      value: applicationSet => formatSources(getSources(applicationSet.spec.template?.spec ?? {})),
      hidden: applicationSet => getSources(applicationSet.spec.template?.spec ?? {}).length === 0,
    },
    {
      name: "Destination",
      value: applicationSet => formatDestination(applicationSet.spec.template?.spec?.destination),
      hidden: applicationSet => !applicationSet.spec.template?.spec?.destination,
    },
    {
      name: "Go Template",
      value: applicationSet => applicationSet.spec.goTemplate ? "Yes" : "No",
    },
    {
      name: "Strategy",
      value: applicationSet => applicationSet.spec.strategy?.type,
      hidden: applicationSet => !applicationSet.spec.strategy?.type,
    },
    {
      name: "Applications Sync",
      value: applicationSet => applicationSet.spec.syncPolicy?.applicationsSync,
      hidden: applicationSet => !applicationSet.spec.syncPolicy?.applicationsSync,
    },
    {
      name: "Preserve Resources On Deletion",
      value: applicationSet => applicationSet.spec.syncPolicy?.preserveResourcesOnDeletion ? "Yes" : "No",
      hidden: applicationSet => applicationSet.spec.syncPolicy?.preserveResourcesOnDeletion === undefined,
    },
    {
      name: "Applications",
      value: getApplicationCount,
    },
  ],
  DetailsComponent: ApplicationSetDetails,

  // Rendered by ApplicationSetDetails, as "ErrorOccurred" is healthy when false
  getConditions: () => undefined,
}));
