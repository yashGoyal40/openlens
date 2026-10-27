/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { ArgoRevisionHistory, ArgoSyncPolicy } from "../common/argo-cd-resources";
import { ArgoApplication, argoApplicationsDescriptor, argoCdGroup } from "../common/argo-cd-resources";
import { argoApplicationsRoutes } from "../common/argo-cd-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { DurationAbsoluteTimestamp } from "../../../../renderer/components/events/duration-absolute";
import { sortByTimestamp, TimeAgo } from "../../renderer/gitops-view-helpers";
import {
  ArgoConditions,
  ArgoResourceLink,
  formatDestination,
  formatSource,
  formatSources,
  getSources,
  HealthStatusBadge,
  isInClusterDestination,
  OperationPhaseBadge,
  SyncStatusBadge,
} from "./argo-cd-view-helpers";
import argoCdSidebarGroupInjectable from "./argo-cd-sidebar-group.injectable";

const getLastSyncedAt = (app: ArgoApplication) => app.status?.operationState?.finishedAt;

const getSyncRevisions = (app: ArgoApplication) => (
  app.status?.sync?.revisions ?? (app.status?.sync?.revision ? [app.status.sync.revision] : [])
);

const getLastHistoryEntry = (app: ArgoApplication): ArgoRevisionHistory | undefined => (
  app.status?.history?.[app.status.history.length - 1]
);

const formatSyncPolicy = (syncPolicy: ArgoSyncPolicy | undefined) => {
  const automated = syncPolicy?.automated;

  if (!automated || automated.enabled === false) {
    return "Manual";
  }

  const options = [
    automated.prune && "prune",
    automated.selfHeal && "self-heal",
    automated.allowEmpty && "allow empty",
  ].filter(Boolean);

  return options.length
    ? `Automated (${options.join(", ")})`
    : "Automated";
};

const ApplicationDetails = ({ object: app }: { object: ArgoApplication }) => {
  const linkable = isInClusterDestination(app.spec.destination);

  return (
    <>
      <ResourceTable
        title="Sources"
        rows={getSources(app.spec)}
        columns={[
          { title: "Repository", className: "wide", value: source => source.repoURL },
          { title: "Path / Chart", value: source => source.path ?? source.chart },
          { title: "Revision", value: source => source.targetRevision ?? "HEAD" },
          { title: "Ref", value: source => source.ref ?? source.name },
        ]}
      />
      <ResourceTable
        title="Resources"
        rows={app.status?.resources}
        columns={[
          { title: "Kind", value: resource => resource.kind },
          { title: "Namespace", value: resource => resource.namespace },
          {
            title: "Name",
            className: "wide",
            value: resource => (
              <ArgoResourceLink
                resource={resource}
                parent={app}
                linkable={linkable}
              />
            ),
          },
          {
            title: "Sync",
            value: resource => (
              <SyncStatusBadge
                status={resource.status}
                tooltip={resource.requiresPruning ? "Requires pruning" : undefined}
              />
            ),
          },
          { title: "Health", value: resource => resource.health && <HealthStatusBadge health={resource.health} /> },
        ]}
      />
      <ResourceTable
        title="History"
        rows={app.status?.history?.slice().reverse()}
        columns={[
          { title: "ID", className: "narrow", value: entry => entry.id },
          { title: "Revision", className: "wide", value: entry => (entry.revisions ?? [entry.revision]).filter(Boolean).join(", ") },
          { title: "Deployed", value: entry => <TimeAgo timestamp={entry.deployedAt} /> },
        ]}
      />
      <ArgoConditions conditions={app.status?.conditions} />
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
} = createResourceViewInjectables(defineResourceView<ArgoApplication>({
  descriptor: argoApplicationsDescriptor,
  objectConstructor: ArgoApplication,
  routes: argoApplicationsRoutes,
  sidebar: {
    parentId: argoCdSidebarGroupInjectable.id,
    orderNumber: 10,
  },
  columns: [
    {
      id: "project",
      title: "Project",
      value: app => app.spec.project,
      sortBy: app => app.spec.project,
      search: app => app.spec.project,
    },
    {
      id: "sync",
      title: "Sync",
      value: app => <SyncStatusBadge status={app.status?.sync?.status} tooltip={getSyncRevisions(app).join("\n") || undefined} />,
      sortBy: app => app.status?.sync?.status,
      search: app => app.status?.sync?.status,
    },
    {
      id: "health",
      title: "Health",
      value: app => <HealthStatusBadge health={app.status?.health} />,
      sortBy: app => app.status?.health?.status,
      search: app => app.status?.health?.status,
    },
    {
      id: "source",
      title: "Source",
      size: "wide",
      value: app => formatSources(getSources(app.spec)),
      search: app => getSources(app.spec).flatMap(source => [source.repoURL, source.path, source.chart]),
    },
    {
      id: "destination",
      title: "Destination",
      value: app => formatDestination(app.spec.destination),
      sortBy: app => formatDestination(app.spec.destination),
      search: app => formatDestination(app.spec.destination),
    },
    {
      id: "last-sync",
      title: "Last Sync",
      value: app => <TimeAgo timestamp={getLastSyncedAt(app)} />,
      sortBy: app => sortByTimestamp(getLastSyncedAt(app)),
    },
  ],
  details: [
    {
      name: "Project",
      value: app => (
        <ObjectReferenceLink
          parent={app}
          reference={{
            kind: "AppProject",
            group: argoCdGroup,
            name: app.spec.project,
            namespace: app.status?.controllerNamespace,
          }}
        />
      ),
    },
    {
      name: "Sync Status",
      value: app => <SyncStatusBadge status={app.status?.sync?.status} />,
    },
    {
      name: "Synced Revision",
      value: app => getSyncRevisions(app).join(", "),
      hidden: app => getSyncRevisions(app).length === 0,
    },
    {
      name: "Health",
      value: app => (
        <>
          <HealthStatusBadge health={app.status?.health} />
          {app.status?.health?.message && ` ${app.status.health.message}`}
        </>
      ),
    },
    {
      name: "Source",
      value: app => formatSource(getSources(app.spec)[0]),
      hidden: app => getSources(app.spec).length !== 1,
    },
    {
      name: "Destination",
      value: app => [
        app.spec.destination.name ?? app.spec.destination.server,
        app.spec.destination.namespace && `namespace ${app.spec.destination.namespace}`,
      ].filter(Boolean).join(", "),
    },
    {
      name: "Sync Policy",
      value: app => formatSyncPolicy(app.spec.syncPolicy),
    },
    {
      name: "Sync Options",
      value: app => app.spec.syncPolicy?.syncOptions?.join(", "),
      hidden: app => !app.spec.syncPolicy?.syncOptions?.length,
    },
    {
      name: "Operation",
      value: ({ status }) => status?.operationState && (
        <>
          <OperationPhaseBadge phase={status.operationState.phase} />
          {status.operationState.message && ` ${status.operationState.message}`}
        </>
      ),
      hidden: app => !app.status?.operationState,
    },
    {
      name: "Last Sync",
      value: app => <DurationAbsoluteTimestamp timestamp={getLastSyncedAt(app)} />,
      hidden: app => !getLastSyncedAt(app),
    },
    {
      name: "History",
      value: app => {
        const lastEntry = getLastHistoryEntry(app);
        const lastRevision = lastEntry && (lastEntry.revisions ?? [lastEntry.revision]).filter(Boolean).join(", ");

        return [
          `${app.status?.history?.length ?? 0} deployments`,
          lastRevision && `last revision ${lastRevision}`,
        ].filter(Boolean).join(", ");
      },
      hidden: app => !app.status?.history?.length,
    },
    {
      name: "Last Reconciled",
      value: app => <DurationAbsoluteTimestamp timestamp={app.status?.reconciledAt} />,
      hidden: app => !app.status?.reconciledAt,
    },
    {
      name: "External URLs",
      value: app => app.status?.summary?.externalURLs?.map(url => (
        <div key={url}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            {url}
          </a>
        </div>
      )),
      hidden: app => !app.status?.summary?.externalURLs?.length,
    },
  ],
  DetailsComponent: ApplicationDetails,

  // Argo CD conditions only describe problems and have no status, they are rendered by ApplicationDetails instead
  getConditions: () => undefined,
}));
