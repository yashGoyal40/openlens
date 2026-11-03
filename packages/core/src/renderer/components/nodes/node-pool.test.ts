/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { Node } from "@k8slens/kube-object";
import { getInstanceType, getNodePool, getNodePoolDisplayName } from "./node-pool";

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

describe("getNodePoolDisplayName", () => {
  it("drops the unique id that name prefixes add", () => {
    expect(getNodePoolDisplayName("some-cluster-system-0f1e2d3c4b5a69788796a5b4c3")).toBe("some-cluster-system");
    expect(getNodePoolDisplayName("system-20231115093045123400000001")).toBe("system");
  });

  it("keeps names without a generated id", () => {
    expect(getNodePoolDisplayName("apps")).toBe("apps");
    expect(getNodePoolDisplayName("pool-1")).toBe("pool-1");
    expect(getNodePoolDisplayName("apps-2024")).toBe("apps-2024");
    expect(getNodePoolDisplayName("system-abc123")).toBe("system-abc123");
  });
});

describe("getInstanceType", () => {
  it("reads the well-known label", () => {
    expect(getInstanceType(nodeWithLabels({ "node.kubernetes.io/instance-type": "m6i.xlarge" }))).toBe("m6i.xlarge");
  });

  it("falls back to the label used before Kubernetes 1.17", () => {
    expect(getInstanceType(nodeWithLabels({ "beta.kubernetes.io/instance-type": "e2-standard-4" }))).toBe("e2-standard-4");
  });

  it("prefers the well-known label", () => {
    expect(getInstanceType(nodeWithLabels({
      "beta.kubernetes.io/instance-type": "old",
      "node.kubernetes.io/instance-type": "new",
    }))).toBe("new");
  });

  it("has none when the cloud provider does not set it", () => {
    expect(getInstanceType(nodeWithLabels({ "kubernetes.io/hostname": "some-node" }))).toBeUndefined();
  });
});
