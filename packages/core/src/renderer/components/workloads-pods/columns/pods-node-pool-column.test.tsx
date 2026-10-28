/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { render } from "@testing-library/react";
import { createContainer } from "@ogre-tools/injectable";
import { Node, Pod } from "@k8slens/kube-object";
import nodeStoreInjectable from "../../nodes/store.injectable";
import { podsNodePoolColumnInjectable } from "./pods-node-pool-column.injectable";

const node = new Node({
  apiVersion: "v1",
  kind: "Node",
  metadata: {
    name: "some-node",
    uid: "some-node-uid",
    resourceVersion: "1",
    selfLink: "/api/v1/nodes/some-node",
    labels: { "karpenter.sh/nodepool": "some-pool" },
  },
});

const createPod = (nodeName?: string) => new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name: "some-pod",
    namespace: "default",
    uid: "some-pod-uid",
    resourceVersion: "1",
    selfLink: "/api/v1/namespaces/default/pods/some-pod",
  },
  spec: { containers: [], nodeName },
});

describe("pods node pool column", () => {
  const getColumn = () => {
    const di = createContainer("some-container");

    di.register(nodeStoreInjectable, podsNodePoolColumnInjectable);
    di.override(nodeStoreInjectable, () => ({
      getByName: (name: string) => (name === "some-node" ? node : undefined),
    }) as any);

    return di.inject(podsNodePoolColumnInjectable);
  };

  const renderCell = (pod: Pod) => render(<>{getColumn().content(pod) as React.ReactNode}</>).container.textContent;

  it("shows the node pool of the pod's node", () => {
    expect(renderCell(createPod("some-node"))).toBe("some-pool");
  });

  it("stays empty for pods that are not scheduled or whose node is unknown", () => {
    expect(renderCell(createPod())).toBe("");
    expect(renderCell(createPod("other-node"))).toBe("");
  });

  it("shows the pool without a generated id, with the full name on hover", () => {
    const prefixedNode = new Node({
      ...node.toPlainObject(),
      metadata: { ...node.metadata, labels: { "eks.amazonaws.com/nodegroup": "system-0f1e2d3c4b5a69788796a5b4c3" }},
    } as any);
    const di = createContainer("some-container");

    di.register(nodeStoreInjectable, podsNodePoolColumnInjectable);
    di.override(nodeStoreInjectable, () => ({ getByName: () => prefixedNode }) as any);

    const result = render(<>{di.inject(podsNodePoolColumnInjectable).content(createPod("some-node")) as React.ReactNode}</>);

    expect(result.container.textContent).toBe("system");
    expect(result.getByTitle("system-0f1e2d3c4b5a69788796a5b4c3")).toBeInTheDocument();
  });

  it("sorts by node pool", () => {
    expect(getColumn().sortingCallBack?.(createPod("some-node"))).toBe("some-pool");
  });

  it("comes between the Node (50) and QoS (40) columns", () => {
    expect(getColumn().priority).toBeLessThan(50);
    expect(getColumn().priority).toBeGreaterThan(40);
  });
});
