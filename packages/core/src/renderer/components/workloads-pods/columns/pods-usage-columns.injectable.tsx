/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { observer } from "mobx-react";
import type { Pod } from "@k8slens/kube-object";
import { bytesToUnits } from "@k8slens/utilities";
import { podListLayoutColumnInjectionToken } from "@k8slens/list-layout";
import type { PodStore } from "../store";
import podStoreInjectable from "../store.injectable";

/**
 * Usage comes from the metrics server (metrics.k8s.io), so pods without metrics render empty instead of zero
 */
const hasKubeMetrics = (podStore: PodStore, pod: Pod) => podStore.kubeMetrics.some(metric => (
  metric.getName() === pod.getName()
  && metric.getNs() === pod.getNs()
));

const PodCpuUsage = observer(({ podStore, pod }: { podStore: PodStore; pod: Pod }) => (
  hasKubeMetrics(podStore, pod)
    ? <>{podStore.getPodKubeMetrics(pod).cpu.toFixed(3)}</>
    : null
));

const PodMemoryUsage = observer(({ podStore, pod }: { podStore: PodStore; pod: Pod }) => (
  hasKubeMetrics(podStore, pod)
    ? <>{bytesToUnits(podStore.getPodKubeMetrics(pod).memory)}</>
    : null
));

export const podsCpuColumnInjectable = getInjectable({
  id: "pods-cpu-column",
  instantiate: (di) => {
    const podStore = di.inject(podStoreInjectable);
    const columnId = "cpu";

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: 86,
      content: (pod) => (
        <PodCpuUsage
          key="cpu"
          podStore={podStore}
          pod={pod} />
      ),
      header: { title: "CPU", className: "cpu", sortBy: columnId, id: columnId },
      sortingCallBack: (pod) => podStore.getPodKubeMetrics(pod).cpu,
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});

export const podsMemoryColumnInjectable = getInjectable({
  id: "pods-memory-column",
  instantiate: (di) => {
    const podStore = di.inject(podStoreInjectable);
    const columnId = "memory";

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: 85,
      content: (pod) => (
        <PodMemoryUsage
          key="memory"
          podStore={podStore}
          pod={pod} />
      ),
      header: { title: "Memory", className: "memory", sortBy: columnId, id: columnId },
      sortingCallBack: (pod) => podStore.getPodKubeMetrics(pod).memory,
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
