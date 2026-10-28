/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useEffect } from "react";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { PersistentVolumeClaim } from "@k8slens/kube-object";
import { isDefined } from "@k8slens/utilities";
import { isMetricsEmpty } from "../../../common/k8s-api/endpoints/metrics.api";
import type { PersistentVolumeClaimMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-persistent-volume-claim-metrics.injectable";
import { DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { UsageMetrics } from "../metrics-panel/usage-metrics";
import type { PodStore } from "../workloads-pods/store";
import podStoreInjectable from "../workloads-pods/store.injectable";
import type { PodUsageHistory } from "../workloads-pods/usage-history/pod-usage-history.injectable";
import podUsageHistoryInjectable from "../workloads-pods/usage-history/pod-usage-history.injectable";
import { getPrometheusSeries, getVolumeSeries, persistentVolumeClaimPrometheusSeriesDefinitions } from "../workloads-pods/usage-history/usage-series";
import persistentVolumeClaimMetricsInjectable from "./metrics.injectable";

interface Dependencies {
  podStore: PodStore;
  podUsageHistory: PodUsageHistory;
  prometheusMetrics: IAsyncComputed<PersistentVolumeClaimMetricData>;
}

const NonInjectedPersistentVolumeClaimUsageMetrics = observer(({ object: claim, podStore, podUsageHistory, prometheusMetrics }: KubeObjectDetailsProps<PersistentVolumeClaim> & Dependencies) => {
  const namespace = claim.getNs();
  const name = claim.getName();

  useEffect(() => podUsageHistory.watchVolume(
    namespace,
    name,
    () => claim.getPods(podStore.items).map(pod => pod.getNodeName()).filter(isDefined),
  ), [namespace, name]);

  const prometheus = toJS(prometheusMetrics.value.get());

  return (
    <>
      <DrawerTitle>Metrics</DrawerTitle>
      <UsageMetrics
        id="volume"
        tabs={["Disk"]}
        fromPrometheus={prometheus && !isMetricsEmpty(prometheus)
          ? (tab) => getPrometheusSeries(prometheus, tab, persistentVolumeClaimPrometheusSeriesDefinitions)
          : undefined}
        fromMetricsServer={(tab, window) => getVolumeSeries(podUsageHistory.getVolumeSamples(namespace, name), window)}
        fallback={{ source: "Kubelet", tabs: ["Disk"] }}
      />
    </>
  );
});

/**
 * How full a persistent volume claim is, on top of its details
 */
export const PersistentVolumeClaimUsageMetrics = withInjectables<Dependencies, KubeObjectDetailsProps<PersistentVolumeClaim>>(NonInjectedPersistentVolumeClaimUsageMetrics, {
  getProps: (di, props) => ({
    ...props,
    podStore: di.inject(podStoreInjectable),
    podUsageHistory: di.inject(podUsageHistoryInjectable),
    prometheusMetrics: di.inject(persistentVolumeClaimMetricsInjectable, props.object),
  }),
});
