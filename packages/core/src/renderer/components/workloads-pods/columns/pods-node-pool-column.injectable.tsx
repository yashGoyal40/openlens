/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { observer } from "mobx-react";
import type { Pod } from "@k8slens/kube-object";
import { podListLayoutColumnInjectionToken } from "@k8slens/list-layout";
import type { NodeStore } from "../../nodes/store";
import nodeStoreInjectable from "../../nodes/store.injectable";
import { getNodePool, getNodePoolDisplayName } from "../../nodes/node-pool";

/**
 * The node pool of the node the pod is scheduled on
 */
export const getPodNodePool = (nodeStore: NodeStore, pod: Pod) => {
  const node = nodeStore.getByName(pod.getNodeName() ?? "");

  return node ? getNodePool(node) : undefined;
};

const PodNodePool = observer(({ nodeStore, pod }: { nodeStore: NodeStore; pod: Pod }) => {
  const pool = getPodNodePool(nodeStore, pod);

  return pool
    ? <span title={pool}>{getNodePoolDisplayName(pool)}</span>
    : null;
});

export const podsNodePoolColumnInjectable = getInjectable({
  id: "pods-node-pool-column",
  instantiate: (di) => {
    const nodeStore = di.inject(nodeStoreInjectable);
    const columnId = "node-pool";

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      // right after Node
      priority: 45,
      content: (pod) => <PodNodePool nodeStore={nodeStore} pod={pod} />,
      header: { title: "Node Pool", className: "node-pool", sortBy: columnId, id: columnId },
      sortingCallBack: (pod) => getPodNodePool(nodeStore, pod),
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
