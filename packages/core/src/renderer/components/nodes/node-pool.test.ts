/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { Node } from "@k8slens/kube-object";
import { getNodePool } from "./node-pool";

const nodeWithLabels = (labels: Record<string, string>) => new Node({
  apiVersion: "v1",
  kind: "Node",
  metadata: {
    name: "some-node",
    uid: "some-uid",
    resourceVersion: "1",
    selfLink: "/api/v1/nodes/some-node",
    labels,
  },
});

describe("getNodePool", () => {
  it("reads the EKS managed node group", () => {
    expect(getNodePool(nodeWithLabels({
      "eks.amazonaws.com/nodegroup": "system-nodes",
      "nodetype": "general",
    }))).toBe("system-nodes");
  });

  it("prefers the Karpenter node pool", () => {
    expect(getNodePool(nodeWithLabels({
      "karpenter.sh/nodepool": "default",
      "eks.amazonaws.com/nodegroup": "system",
    }))).toBe("default");
  });

  it("reads GKE and AKS pools", () => {
    expect(getNodePool(nodeWithLabels({ "cloud.google.com/gke-nodepool": "pool-1" }))).toBe("pool-1");
    expect(getNodePool(nodeWithLabels({ "kubernetes.azure.com/agentpool": "agentpool1" }))).toBe("agentpool1");
  });

  it("is undefined for nodes without a known pool label", () => {
    expect(getNodePool(nodeWithLabels({ "kubernetes.io/os": "linux" }))).toBeUndefined();
  });
});
