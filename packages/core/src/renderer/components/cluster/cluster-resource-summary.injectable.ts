/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed, observable, runInAction } from "mobx";
import { interval } from "@k8slens/utilities";
import nodeStoreInjectable from "../nodes/store.injectable";
import podStoreInjectable from "../workloads-pods/store.injectable";
import requestNodeUsageInjectable from "../nodes/request-node-usage.injectable";
import type { NodeUsage } from "../nodes/request-node-usage.injectable";
import { computeClusterResourceSummary } from "./cluster-resource-summary";

const clusterResourceSummaryInjectable = getInjectable({
  id: "cluster-resource-summary",

  instantiate: (di) => {
    const nodeStore = di.inject(nodeStoreInjectable);
    const podStore = di.inject(podStoreInjectable);
    const requestNodeUsage = di.inject(requestNodeUsageInjectable);
    const usage = observable.box<Map<string, NodeUsage> | undefined>(undefined, { deep: false });

    const usagePoller = interval(30, () => {
      void (async () => {
        try {
          const current = await requestNodeUsage();

          runInAction(() => usage.set(current));
        } catch {
          // metrics-server is not installed
          runInAction(() => usage.set(undefined));
        }
      })();
    });

    return {
      value: computed(() => computeClusterResourceSummary(nodeStore.items, podStore.items, usage.get())),
      /**
       * Polls metrics-server while the overview is open, returns the disposer
       */
      watchUsage: () => {
        usagePoller.start(true);

        return () => usagePoller.stop();
      },
    };
  },
});

export default clusterResourceSummaryInjectable;
