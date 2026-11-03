/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { render } from "@testing-library/react";
import { createContainer } from "@ogre-tools/injectable";
import { Node, Pod } from "@k8slens/kube-object";
import nodeStoreInjectable from "../../nodes/store.injectable";
import { podsInstanceTypeColumnInjectable } from "./pods-instance-type-column.injectable";

const node = new Node({
  apiVersion: "v1",
  kind: "Node",
  metadata: {
    name: "some-node",
    uid: "some-node-uid",
    resourceVersion: "1",
    selfLink: "/api/v1/nodes/some-node",
    labels: { "node.kubernetes.io/instance-type": "m6i.xlarge" },
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

describe("pods instance type column", () => {
  const getColumn = () => {
    const di = createContainer("some-container");

    di.register(nodeStoreInjectable, podsInstanceTypeColumnInjectable);
    di.override(nodeStoreInjectable, () => ({
      getByName: (name: string) => (name === "some-node" ? node : undefined),
    }) as any);

    return di.inject(podsInstanceTypeColumnInjectable);
  };

  const renderCell = (pod: Pod) => render(<>{getColumn().content(pod) as React.ReactNode}</>).container.textContent;

  it("shows the instance type of the pod's node", () => {
    expect(renderCell(createPod("some-node"))).toBe("m6i.xlarge");
  });

  it("stays empty for pods that are not scheduled or whose node is unknown", () => {
    expect(renderCell(createPod())).toBe("");
    expect(renderCell(createPod("other-node"))).toBe("");
  });

  it("sorts by instance type", () => {
    expect(getColumn().sortingCallBack?.(createPod("some-node"))).toBe("m6i.xlarge");
  });

  it("comes between the Node Pool (45) and QoS (40) columns", () => {
    expect(getColumn().priority).toBeLessThan(45);
    expect(getColumn().priority).toBeGreaterThan(40);
  });
});
