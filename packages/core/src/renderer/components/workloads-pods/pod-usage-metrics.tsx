/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useEffect } from "react";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { Container, Pod } from "@k8slens/kube-object";
import { getItemMetrics, isMetricsEmpty } from "../../../common/k8s-api/endpoints/metrics.api";
import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import { DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { UsageMetrics } from "../metrics-panel/usage-metrics";
import podMetricsInjectable from "./metrics.injectable";
import podContainerMetricsInjectable from "./container-metrics.injectable";
import type { PodUsageHistory } from "./usage-history/pod-usage-history.injectable";
import podUsageHistoryInjectable from "./usage-history/pod-usage-history.injectable";
import { containerPrometheusSeriesDefinitions, getMetricsServerSeries, getPrometheusSeries, podPrometheusSeriesDefinitions } from "./usage-history/usage-series";

export interface PodUsageMetricsProps {
  pod: Pod;

  /**
   * Without a container the usage of the whole pod is shown
   */
  container?: Container;
}

interface Dependencies {
  podUsageHistory: PodUsageHistory;
  prometheusMetrics: IAsyncComputed<PodMetricData>;
}

const NonInjectedPodUsageMetrics = observer(({ pod, container, podUsageHistory, prometheusMetrics }: PodUsageMetricsProps & Dependencies) => {
  const namespace = pod.getNs();
  const name = pod.getName();

  useEffect(() => podUsageHistory.watchPod(namespace, name), [namespace, name]);

  const allPrometheus = toJS(prometheusMetrics.value.get());
  const prometheus = container
    ? getItemMetrics(allPrometheus, container.name)
    : allPrometheus;
  const definitions = container ? containerPrometheusSeriesDefinitions : podPrometheusSeriesDefinitions;

  return (
    <UsageMetrics
      id={container ? `container-${container.name}` : "pod"}
      tabs={container ? ["CPU", "Memory", "Filesystem"] : ["CPU", "Memory", "Network", "Filesystem"]}
      fromPrometheus={prometheus && !isMetricsEmpty(prometheus)
        ? (tab) => getPrometheusSeries(prometheus, tab, definitions)
        : undefined}
      fromMetricsServer={(tab, window) => getMetricsServerSeries(podUsageHistory.getSamples(namespace, name), tab, window, container)}
    />
  );
});

export const PodUsageMetrics = withInjectables<Dependencies, PodUsageMetricsProps>(NonInjectedPodUsageMetrics, {
  getProps: (di, props) => ({
    ...props,
    podUsageHistory: di.inject(podUsageHistoryInjectable),
    prometheusMetrics: props.container
      ? di.inject(podContainerMetricsInjectable, { pod: props.pod, container: props.container })
      : di.inject(podMetricsInjectable, props.pod),
  }),
});

/**
 * The metrics on top of the details of a pod
 */
export const PodMetricsSection = ({ object }: KubeObjectDetailsProps<Pod>) => (
  <>
    <DrawerTitle>Metrics</DrawerTitle>
    <PodUsageMetrics pod={object} />
  </>
);

/**
 * The metrics of one container, within its details
 */
export const PodContainerUsageMetrics = ({ pod, container }: { pod: Pod; container: Container }) => (
  <PodUsageMetrics pod={pod} container={container} />
);
