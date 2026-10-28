/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useEffect } from "react";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { Node } from "@k8slens/kube-object";
import { cpuUnitsToNumber, unitsToBytes } from "@k8slens/utilities";
import { isMetricsEmpty } from "../../../common/k8s-api/endpoints/metrics.api";
import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import { DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { UsageMetrics } from "../metrics-panel/usage-metrics";
import type { PodUsageHistory } from "../workloads-pods/usage-history/pod-usage-history.injectable";
import podUsageHistoryInjectable from "../workloads-pods/usage-history/pod-usage-history.injectable";
import { getCombinedMetricsServerSeries, getPrometheusSeries, nodePrometheusSeriesDefinitions, usageColors } from "../workloads-pods/usage-history/usage-series";
import nodeMetricsInjectable from "./metrics.injectable";

interface Dependencies {
  podUsageHistory: PodUsageHistory;
  prometheusMetrics: IAsyncComputed<ClusterMetricData>;
}

const NonInjectedNodeUsageMetrics = observer(({ object: node, podUsageHistory, prometheusMetrics }: KubeObjectDetailsProps<Node> & Dependencies) => {
  useEffect(() => podUsageHistory.watchNodes(), []);

  const prometheus = toJS(prometheusMetrics.value.get());
  const { allocatable, capacity } = node.status ?? {};
  const cpu = (value: string | undefined) => (value === undefined ? undefined : cpuUnitsToNumber(value));
  const bytes = (value: string | undefined) => (value === undefined ? undefined : unitsToBytes(value));

  return (
    <>
      <DrawerTitle>Metrics</DrawerTitle>
      <UsageMetrics
        id="node"
        tabs={["CPU", "Memory", "Disk", "Pods"]}
        fromPrometheus={prometheus && !isMetricsEmpty(prometheus)
          ? (tab) => getPrometheusSeries(prometheus, tab, nodePrometheusSeriesDefinitions)
          : undefined}
        fromMetricsServer={(tab, window) => getCombinedMetricsServerSeries(podUsageHistory.getNodeSnapshots(), tab, window, {
          pods: [node.getName()],
          levels: {
            CPU: [
              { label: "Allocatable Capacity", value: cpu(allocatable?.cpu), color: usageColors.allocatable },
              { label: "Capacity", value: cpu(capacity?.cpu), color: usageColors.capacity },
            ],
            Memory: [
              { label: "Allocatable Capacity", value: bytes(allocatable?.memory), color: usageColors.allocatable },
              { label: "Capacity", value: bytes(capacity?.memory), color: usageColors.capacity },
            ],
          },
        })}
      />
    </>
  );
});

/**
 * The usage of a node, on top of its details
 */
export const NodeUsageMetrics = withInjectables<Dependencies, KubeObjectDetailsProps<Node>>(NonInjectedNodeUsageMetrics, {
  getProps: (di, props) => ({
    ...props,
    podUsageHistory: di.inject(podUsageHistoryInjectable),
    prometheusMetrics: di.inject(nodeMetricsInjectable, props.object),
  }),
});
