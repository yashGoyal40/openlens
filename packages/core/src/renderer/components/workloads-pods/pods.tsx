/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pods.scss";

import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { EventStore } from "../events/store";
import type { PodStore } from "./store";
import eventStoreInjectable from "../events/store.injectable";
import podStoreInjectable from "./store.injectable";
import type { SpecificKubeListLayoutColumn } from "@k8slens/list-layout";
import { podListLayoutColumnInjectionToken } from "@k8slens/list-layout";
import type { Pod } from "@k8slens/kube-object";
import { interval } from "@k8slens/utilities";
import type { IComputedValue } from "mobx";
import type { NodeStore } from "../nodes/store";
import nodeStoreInjectable from "../nodes/store.injectable";
import { shouldShowResourceInjectionToken } from "../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { getPodNodePool } from "./columns/pods-node-pool-column.injectable";

interface Dependencies {
  eventStore: EventStore;
  podStore: PodStore;
  nodeStore: NodeStore;
  canListNodes: IComputedValue<boolean>;
  columns: SpecificKubeListLayoutColumn<Pod>[];
}

const NonInjectedPods = observer((props: Dependencies) => {
  const {
    columns,
    eventStore,
    podStore,
    nodeStore,
    canListNodes,
  } = props;

  // CPU and memory columns show metrics server usage, refreshed while the list is open
  useEffect(() => {
    const metricsWatcher = interval(60, () => void podStore.loadKubeMetrics());

    metricsWatcher.start(true);

    return () => metricsWatcher.stop();
  }, [podStore]);

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        className="Pods"
        store={podStore}
        // status icon component uses event store, node pool column uses node store
        dependentStores={canListNodes.get() ? [eventStore, nodeStore] : [eventStore]}
        tableId="workloads_pods"
        isConfigurable
        searchFilters={[
          pod => pod.getSearchFields(),
          pod => pod.getStatusMessage(),
          pod => pod.status?.podIP,
          pod => pod.getNodeName(),
          pod => getPodNodePool(nodeStore, pod),
        ]}
        renderHeaderTitle="Pods"
        renderTableHeader={[]}
        renderTableContents={() => []}
        columns={columns}
      />
    </SiblingsInTabLayout>
  );
});

export const Pods = withInjectables<Dependencies>(NonInjectedPods, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
    podStore: di.inject(podStoreInjectable),
    nodeStore: di.inject(nodeStoreInjectable),
    canListNodes: di.inject(shouldShowResourceInjectionToken, { apiName: "nodes", group: "" }),
    columns: di.injectMany(podListLayoutColumnInjectionToken),
  }),
});
