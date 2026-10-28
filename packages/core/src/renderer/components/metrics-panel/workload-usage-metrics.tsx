/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useEffect } from "react";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { DaemonSet, Deployment, Job, KubeObject, Namespace, ReplicaSet, StatefulSet } from "@k8slens/kube-object";
import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";
import { isMetricsEmpty } from "../../../common/k8s-api/endpoints/metrics.api";
import { DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { PodStore } from "../workloads-pods/store";
import podStoreInjectable from "../workloads-pods/store.injectable";
import type { PodUsageHistory } from "../workloads-pods/usage-history/pod-usage-history.injectable";
import podUsageHistoryInjectable from "../workloads-pods/usage-history/pod-usage-history.injectable";
import type { PodMetricKey } from "../workloads-pods/usage-history/usage-series";
import { getCombinedMetricsServerSeries, getPrometheusSeries, podPrometheusSeriesDefinitions } from "../workloads-pods/usage-history/usage-series";
import deploymentMetricsInjectable from "../workloads-deployments/metrics.injectable";
import statefulSetMetricsInjectable from "../workloads-statefulsets/metrics.injectable";
import daemonSetMetricsInjectable from "../workloads-daemonsets/metrics.injectable";
import replicaSetMetricsInjectable from "../workloads-replicasets/metrics.injectable";
import jobMetricsInjectable from "../workloads-jobs/metrics.injectable";
import namespaceMetricsInjectable from "../namespaces/metrics.injectable";
import { UsageMetrics } from "./usage-metrics";

type PrometheusMetrics = IAsyncComputed<Partial<Record<PodMetricKey, MetricData>> | null | undefined>;

export interface WorkloadUsageMetricsProps {
  namespace: string;

  /**
   * The pods to add up, every pod in the namespace when not given
   */
  getPodNames?: () => string[];
  prometheusMetrics: PrometheusMetrics;
}

interface Dependencies {
  podUsageHistory: PodUsageHistory;
}

const NonInjectedWorkloadUsageMetrics = observer(({ namespace, getPodNames, prometheusMetrics, podUsageHistory }: WorkloadUsageMetricsProps & Dependencies) => {
  useEffect(() => podUsageHistory.watchNamespace(namespace), [namespace]);

  const prometheus = toJS(prometheusMetrics.value.get());

  return (
    <>
      <DrawerTitle>Metrics</DrawerTitle>
      <UsageMetrics
        id="workload"
        tabs={["CPU", "Memory", "Network", "Filesystem"]}
        fromPrometheus={prometheus && !isMetricsEmpty(prometheus)
          ? (tab) => getPrometheusSeries(prometheus, tab, podPrometheusSeriesDefinitions)
          : undefined}
        fromMetricsServer={(tab, window) => getCombinedMetricsServerSeries(
          podUsageHistory.getNamespaceSnapshots(namespace),
          tab,
          window,
          { pods: getPodNames?.() },
        )}
      />
    </>
  );
});

/**
 * The usage of the pods of a workload added up, on top of its details
 */
export const WorkloadUsageMetrics = withInjectables<Dependencies, WorkloadUsageMetricsProps>(NonInjectedWorkloadUsageMetrics, {
  getProps: (di, props) => ({
    ...props,
    podUsageHistory: di.inject(podUsageHistoryInjectable),
  }),
});

interface SectionDependencies {
  podStore: PodStore;
  prometheusMetrics: PrometheusMetrics;
}

const podNamesOf = (podStore: PodStore, owner: KubeObject) => () => (
  podStore.getPodsByOwnerId(owner.getId()).map(pod => pod.getName())
);

export const DeploymentUsageMetrics = withInjectables<SectionDependencies, KubeObjectDetailsProps<Deployment>>(
  ({ object, podStore, prometheusMetrics }) => (
    <WorkloadUsageMetrics
      namespace={object.getNs()}
      // the pods belong to the replica sets of the deployment, so they are found by its labels
      getPodNames={() => podStore.getByLabel(object.getTemplateLabels())
        .filter(pod => pod.getNs() === object.getNs())
        .map(pod => pod.getName())}
      prometheusMetrics={prometheusMetrics}
    />
  ),
  {
    getProps: (di, props) => ({
      ...props,
      podStore: di.inject(podStoreInjectable),
      prometheusMetrics: di.inject(deploymentMetricsInjectable, props.object),
    }),
  },
);

export const StatefulSetUsageMetrics = withInjectables<SectionDependencies, KubeObjectDetailsProps<StatefulSet>>(
  ({ object, podStore, prometheusMetrics }) => (
    <WorkloadUsageMetrics
      namespace={object.getNs()}
      getPodNames={podNamesOf(podStore, object)}
      prometheusMetrics={prometheusMetrics}
    />
  ),
  {
    getProps: (di, props) => ({
      ...props,
      podStore: di.inject(podStoreInjectable),
      prometheusMetrics: di.inject(statefulSetMetricsInjectable, props.object),
    }),
  },
);

export const DaemonSetUsageMetrics = withInjectables<SectionDependencies, KubeObjectDetailsProps<DaemonSet>>(
  ({ object, podStore, prometheusMetrics }) => (
    <WorkloadUsageMetrics
      namespace={object.getNs()}
      getPodNames={podNamesOf(podStore, object)}
      prometheusMetrics={prometheusMetrics}
    />
  ),
  {
    getProps: (di, props) => ({
      ...props,
      podStore: di.inject(podStoreInjectable),
      prometheusMetrics: di.inject(daemonSetMetricsInjectable, props.object),
    }),
  },
);

export const ReplicaSetUsageMetrics = withInjectables<SectionDependencies, KubeObjectDetailsProps<ReplicaSet>>(
  ({ object, podStore, prometheusMetrics }) => (
    <WorkloadUsageMetrics
      namespace={object.getNs()}
      getPodNames={podNamesOf(podStore, object)}
      prometheusMetrics={prometheusMetrics}
    />
  ),
  {
    getProps: (di, props) => ({
      ...props,
      podStore: di.inject(podStoreInjectable),
      prometheusMetrics: di.inject(replicaSetMetricsInjectable, props.object),
    }),
  },
);

export const JobUsageMetrics = withInjectables<SectionDependencies, KubeObjectDetailsProps<Job>>(
  ({ object, podStore, prometheusMetrics }) => (
    <WorkloadUsageMetrics
      namespace={object.getNs()}
      getPodNames={podNamesOf(podStore, object)}
      prometheusMetrics={prometheusMetrics}
    />
  ),
  {
    getProps: (di, props) => ({
      ...props,
      podStore: di.inject(podStoreInjectable),
      prometheusMetrics: di.inject(jobMetricsInjectable, props.object),
    }),
  },
);

export const NamespaceUsageMetrics = withInjectables<Pick<SectionDependencies, "prometheusMetrics">, KubeObjectDetailsProps<Namespace>>(
  ({ object, prometheusMetrics }) => (
    <WorkloadUsageMetrics
      namespace={object.getName()}
      prometheusMetrics={prometheusMetrics}
    />
  ),
  {
    getProps: (di, props) => ({
      ...props,
      prometheusMetrics: di.inject(namespaceMetricsInjectable, props.object),
    }),
  },
);
