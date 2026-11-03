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
import { getInstanceType } from "../../nodes/node-pool";

export const getPodInstanceType = (nodeStore: NodeStore, pod: Pod) => {
  const node = nodeStore.getByName(pod.getNodeName() ?? "");

  return node ? getInstanceType(node) : undefined;
};

const PodInstanceType = observer(({ nodeStore, pod }: { nodeStore: NodeStore; pod: Pod }) => {
  const instanceType = getPodInstanceType(nodeStore, pod);

  return instanceType
    ? <span title={instanceType}>{instanceType}</span>
    : null;
});

export const podsInstanceTypeColumnInjectable = getInjectable({
  id: "pods-instance-type-column",
  instantiate: (di) => {
    const nodeStore = di.inject(nodeStoreInjectable);
    const columnId = "instance-type";

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      // right after Node Pool
      priority: 42,
      content: (pod) => <PodInstanceType nodeStore={nodeStore} pod={pod} />,
      header: { title: "Instance Type", className: "instance-type", sortBy: columnId, id: columnId },
      sortingCallBack: (pod) => getPodInstanceType(nodeStore, pod),
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
