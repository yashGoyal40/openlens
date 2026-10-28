/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getFeature } from "@k8slens/feature-core";
import { clusterOverviewUIBlockInjectionToken, daemonSetDetailsMetricsInjectionToken, deploymentDetailsMetricsInjectionToken, jobDetailsMetricsInjectionToken, namespaceDetailsMetricsInjectionToken, ingressDetailsMetricsInjectionToken, nodeDetailsMetricsInjectionToken, persistentVolumeClaimDetailsMetricsInjectionToken, podDetailsContainerMetricsInjectionToken, podDetailsMetricsInjectionToken, replicaSetDetailsMetricsInjectionToken, statefulSetDetailsMetricsInjectionToken } from "@k8slens/metrics";
import { getInjectable } from "@ogre-tools/injectable";
import { ClusterMetrics } from "../../renderer/components/cluster/cluster-metrics";
import { ClusterPieCharts } from "../../renderer/components/cluster/cluster-pie-charts";
import { PersistentVolumeClaimUsageMetrics } from "../../renderer/components/storage-volume-claims/volume-claim-usage-metrics";
import { PodMetricsSection, PodContainerUsageMetrics } from "../../renderer/components/workloads-pods/pod-usage-metrics";
import { DaemonSetUsageMetrics, DeploymentUsageMetrics, JobUsageMetrics, NamespaceUsageMetrics, ReplicaSetUsageMetrics, StatefulSetUsageMetrics } from "../../renderer/components/metrics-panel/workload-usage-metrics";
import { NodeUsageMetrics } from "../../renderer/components/nodes/node-usage-metrics";
import { IngressMetricsDetailsComponent } from "../../renderer/components/network-ingresses/metrics-details-component";

const clusterPieChartsClusterOverviewInjectable = getInjectable({
  id: "cluster-pie-charts-cluster-overview",

  instantiate: () => ({
    id: "cluster-pie-charts-cluster-overview",
    Component: ClusterPieCharts,
    orderNumber: 2,
  }),

  injectionToken: clusterOverviewUIBlockInjectionToken,
});

const clusterMetricsOverviewBlockInjectable = getInjectable({
  id: "cluster-metrics-overview-block",

  instantiate: () => ({
    id: "cluster-metrics-overview-block",
    Component: ClusterMetrics,
    orderNumber: 1,
  }),

  injectionToken: clusterOverviewUIBlockInjectionToken,
});

const podDetailsMetricsInjectable = getInjectable({
  id: "pod-details-metrics-injectable",
  instantiate: () => ({
    id: "pod-details-metrics",
    Component: PodMetricsSection,
  }),
  injectionToken: podDetailsMetricsInjectionToken,
});

const deploymentDetailsMetricsInjectable = getInjectable({
  id: "deployment-details-metrics-injectable",
  instantiate: () => ({
    id: "deployment-details-metrics",
    Component: DeploymentUsageMetrics,
  }),
  injectionToken: deploymentDetailsMetricsInjectionToken,
});

const podDetailsContainerMetricsInjectable = getInjectable({
  id: "pod-details-container-metrics-injectable",
  instantiate: () => ({
    id: "pod-details-container-metrics",
    Component: PodContainerUsageMetrics,
  }),
  injectionToken: podDetailsContainerMetricsInjectionToken,
});

const nodeDetailsMetricsInjectable = getInjectable({
  id: "node-details-metrics-injectable",
  instantiate: () => ({
    id: "node-details-metrics",
    Component: NodeUsageMetrics,
  }),
  injectionToken: nodeDetailsMetricsInjectionToken,
});

const replicaSetDetailsMetricsInjectable = getInjectable({
  id: "replica-set-details-metrics-injectable",
  instantiate: () => ({
    id: "replica-set-details-metrics",
    Component: ReplicaSetUsageMetrics,
  }),
  injectionToken: replicaSetDetailsMetricsInjectionToken,
});

const persistentVolumeClaimDetailsMetricsInjectable = getInjectable({
  id: "persistent-volume-claim-details-metrics-injectable",
  instantiate: () => ({
    id: "persistent-volume-claim-details-metrics",
    Component: PersistentVolumeClaimUsageMetrics,
  }),
  injectionToken: persistentVolumeClaimDetailsMetricsInjectionToken,
});

const statefulSetDetailsMetricsInjectable = getInjectable({
  id: "stateful-set-details-metrics-injectable",
  instantiate: () => ({
    id: "stateful-set-details-metrics",
    Component: StatefulSetUsageMetrics,
  }),
  injectionToken: statefulSetDetailsMetricsInjectionToken,
});

const namespaceDetailsMetricsInjectable = getInjectable({
  id: "namespace-details-metrics-injectable",
  instantiate: () => ({
    id: "namespace-details-metrics",
    Component: NamespaceUsageMetrics,
  }),
  injectionToken: namespaceDetailsMetricsInjectionToken,
});

const jobDetailsMetricsInjectable = getInjectable({
  id: "job-details-metrics-injectable",
  instantiate: () => ({
    id: "job-details-metrics",
    Component: JobUsageMetrics,
  }),
  injectionToken: jobDetailsMetricsInjectionToken,
});

const daemonSetDetailsMetricsInjectable = getInjectable({
  id: "daemon-set-details-metrics-injectable",
  instantiate: () => ({
    id: "daemon-set-details-metrics",
    Component: DaemonSetUsageMetrics,
  }),
  injectionToken: daemonSetDetailsMetricsInjectionToken,
});

const ingressDetailsMetricsInjectable = getInjectable({
  id: "network-ingress-details-metrics-injectable",
  instantiate: () => ({
    id: "network-ingress-details-metrics",
    Component: IngressMetricsDetailsComponent,
  }),
  injectionToken: ingressDetailsMetricsInjectionToken,
});

export const metricsFeature = getFeature({
  id: "core-metrics-feature",

  register: (di) => {
    di.register(clusterPieChartsClusterOverviewInjectable);
    di.register(clusterMetricsOverviewBlockInjectable);

    di.register(podDetailsMetricsInjectable);
    di.register(podDetailsContainerMetricsInjectable);
    di.register(deploymentDetailsMetricsInjectable);
    di.register(nodeDetailsMetricsInjectable);
    di.register(replicaSetDetailsMetricsInjectable);
    di.register(persistentVolumeClaimDetailsMetricsInjectable);
    di.register(statefulSetDetailsMetricsInjectable);
    di.register(namespaceDetailsMetricsInjectable);
    di.register(jobDetailsMetricsInjectable);
    di.register(daemonSetDetailsMetricsInjectable);
    di.register(ingressDetailsMetricsInjectable);
  },
});
