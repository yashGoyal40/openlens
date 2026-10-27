/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { FluxCrossNamespaceObjectReference } from "../common/flux-resources";
import { FluxHelmRelease, fluxHelmGroup, fluxHelmReleasesDescriptor, fluxSourceGroup } from "../common/flux-resources";
import { fluxHelmReleasesRoutes } from "../common/flux-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import type { StatusTone } from "../../../resource-views/renderer/components/status-badge";
import { StatusBadge } from "../../../resource-views/renderer/components/status-badge";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { TimeAgo } from "../../renderer/gitops-view-helpers";
import {
  DependsOnLinks,
  FluxConditions,
  FluxObjectReferenceLink,
  getFluxColumns,
  getFluxDetails,
} from "./flux-view-helpers";
import fluxSidebarGroupInjectable from "./flux-sidebar-group.injectable";

const releaseStatusTones: Partial<Record<string, StatusTone>> = {
  "deployed": "success",
  "failed": "error",
  "pending-install": "warning",
  "pending-upgrade": "warning",
  "pending-rollback": "warning",
  "uninstalling": "warning",
};

const formatChart = (helmRelease: FluxHelmRelease) => {
  const { chart, chartRef } = helmRelease.spec;

  if (chart) {
    return chart.spec.version
      ? `${chart.spec.chart}@${chart.spec.version}`
      : chart.spec.chart;
  }

  return chartRef
    ? `${chartRef.kind}/${chartRef.name}`
    : undefined;
};

/**
 * The object the chart is fetched from: a HelmRepository, GitRepository or Bucket for `chart`, or an OCIRepository
 * or HelmChart for `chartRef`
 */
const getChartSource = (helmRelease: FluxHelmRelease): FluxCrossNamespaceObjectReference | undefined => (
  helmRelease.spec.chart?.spec.sourceRef ?? helmRelease.spec.chartRef
);

const getReleaseNamespace = (helmRelease: FluxHelmRelease) => helmRelease.spec.targetNamespace ?? helmRelease.getNs();

/**
 * Defaults to "[<target namespace>-]<name>"
 */
const getReleaseName = (helmRelease: FluxHelmRelease) => (
  helmRelease.spec.releaseName
  ?? [helmRelease.spec.targetNamespace, helmRelease.getName()].filter(Boolean).join("-")
);

const getLatestRelease = (helmRelease: FluxHelmRelease) => helmRelease.status?.history?.[0];

const getAppliedRevision = (helmRelease: FluxHelmRelease) => (
  helmRelease.status?.lastAppliedRevision
  ?? helmRelease.status?.history?.find(snapshot => snapshot.status === "deployed")?.chartVersion
);

const getRevision = (helmRelease: FluxHelmRelease) => (
  helmRelease.status?.lastAttemptedRevision
  ?? getAppliedRevision(helmRelease)
  ?? getLatestRelease(helmRelease)?.chartVersion
);

const parseNamespacedName = (namespacedName: string) => {
  const [namespace, name] = namespacedName.split("/");

  return name
    ? { namespace, name }
    : { name: namespace };
};

const HelmReleaseDetails = ({ object: helmRelease }: { object: FluxHelmRelease }) => (
  <>
    <FluxConditions object={helmRelease} />
    <ResourceTable
      title="Values From"
      rows={helmRelease.spec.valuesFrom}
      columns={[
        { title: "Kind", value: reference => reference.kind },
        {
          title: "Name",
          className: "wide",
          value: reference => (
            <ObjectReferenceLink parent={helmRelease} reference={{ kind: reference.kind, group: "", name: reference.name }} />
          ),
        },
        { title: "Key", value: reference => reference.valuesKey ?? "values.yaml" },
        { title: "Target Path", value: reference => reference.targetPath },
        { title: "Optional", className: "narrow", value: reference => reference.optional ? "Yes" : "No" },
      ]}
    />
    <ResourceTable
      title="History"
      rows={helmRelease.status?.history}
      columns={[
        { title: "Revision", className: "narrow", value: snapshot => snapshot.version },
        { title: "Chart", value: snapshot => `${snapshot.chartName}@${snapshot.chartVersion}` },
        { title: "App Version", value: snapshot => snapshot.appVersion },
        {
          title: "Status",
          value: snapshot => <StatusBadge tone={releaseStatusTones[snapshot.status] ?? "vague"} label={snapshot.status} />,
        },
        { title: "Deployed", value: snapshot => <TimeAgo timestamp={snapshot.lastDeployed} /> },
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
} = createResourceViewInjectables(defineResourceView<FluxHelmRelease>({
  descriptor: fluxHelmReleasesDescriptor,
  objectConstructor: FluxHelmRelease,
  routes: fluxHelmReleasesRoutes,
  sidebar: {
    parentId: fluxSidebarGroupInjectable.id,
    orderNumber: 20,
  },
  columns: [
    {
      id: "chart",
      title: "Chart",
      value: formatChart,
      sortBy: formatChart,
      search: formatChart,
    },
    {
      id: "source",
      title: "Source",
      size: "wide",
      value: helmRelease => {
        const source = getChartSource(helmRelease);

        return source && <FluxObjectReferenceLink reference={source} parent={helmRelease} />;
      },
      search: helmRelease => getChartSource(helmRelease)?.name,
    },
    {
      id: "release-namespace",
      title: "Release Namespace",
      value: getReleaseNamespace,
      sortBy: getReleaseNamespace,
      search: getReleaseNamespace,
    },
    {
      id: "revision",
      title: "Revision",
      value: getRevision,
      search: getRevision,
    },
    ...getFluxColumns<FluxHelmRelease>(),
  ],
  details: [
    ...getFluxDetails<FluxHelmRelease>(),
    {
      name: "Chart",
      value: formatChart,
    },
    {
      name: "Chart Source",
      value: helmRelease => {
        const source = getChartSource(helmRelease);

        return source && <FluxObjectReferenceLink reference={source} parent={helmRelease} />;
      },
      hidden: helmRelease => !getChartSource(helmRelease),
    },
    {
      name: "Helm Chart",
      value: helmRelease => helmRelease.status?.helmChart && (
        <ObjectReferenceLink
          parent={helmRelease}
          reference={{ kind: "HelmChart", group: fluxSourceGroup, ...parseNamespacedName(helmRelease.status.helmChart) }}
        />
      ),
      hidden: helmRelease => !helmRelease.status?.helmChart,
    },
    {
      name: "Release Name",
      value: getReleaseName,
    },
    {
      name: "Release Namespace",
      value: getReleaseNamespace,
    },
    {
      name: "Storage Namespace",
      value: helmRelease => helmRelease.status?.storageNamespace ?? helmRelease.spec.storageNamespace,
      hidden: helmRelease => !(helmRelease.status?.storageNamespace ?? helmRelease.spec.storageNamespace),
    },
    {
      name: "Service Account",
      value: helmRelease => helmRelease.spec.serviceAccountName,
      hidden: helmRelease => !helmRelease.spec.serviceAccountName,
    },
    {
      name: "Last Attempted Revision",
      value: helmRelease => [
        helmRelease.status?.lastAttemptedRevision,
        helmRelease.status?.lastAttemptedReleaseAction && `(${helmRelease.status.lastAttemptedReleaseAction})`,
      ].filter(Boolean).join(" "),
      hidden: helmRelease => !helmRelease.status?.lastAttemptedRevision,
    },
    {
      name: "Last Applied Revision",
      value: getAppliedRevision,
      hidden: helmRelease => !getAppliedRevision(helmRelease),
    },
    {
      name: "Failures",
      value: ({ status }) => [
        status?.failures && `${status.failures} total`,
        status?.installFailures && `${status.installFailures} install`,
        status?.upgradeFailures && `${status.upgradeFailures} upgrade`,
      ].filter(Boolean).join(", "),
      hidden: ({ status }) => !status?.failures && !status?.installFailures && !status?.upgradeFailures,
    },
    {
      name: "Depends On",
      value: helmRelease => (
        <DependsOnLinks
          dependencies={helmRelease.spec.dependsOn}
          parent={helmRelease}
          kind="HelmRelease"
          group={fluxHelmGroup}
        />
      ),
      hidden: helmRelease => !helmRelease.spec.dependsOn?.length,
    },
  ],
  DetailsComponent: HelmReleaseDetails,

  // Rendered by HelmReleaseDetails, with the polarity of the Flux condition types
  getConditions: () => undefined,
}));
