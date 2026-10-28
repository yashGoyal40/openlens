/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { Node, Pod } from "@k8slens/kube-object";
import { computeClusterResourceSummary } from "./cluster-resource-summary";

const createNode = (name: string, ready: boolean, pool: string) => new Node({
  apiVersion: "v1",
  kind: "Node",
  metadata: {
    name,
    uid: `${name}-uid`,
    resourceVersion: "1",
    selfLink: `/api/v1/nodes/${name}`,
    labels: { "eks.amazonaws.com/nodegroup": pool },
  },
  status: {
    capacity: { cpu: "4", memory: "16Gi", pods: "110" },
    allocatable: { cpu: "3900m", memory: "15Gi", pods: "100" },
    conditions: [{ type: "Ready", status: ready ? "True" : "False" }],
  },
});

const createPod = (name: string, phase: string, cpu: string, memory: string) => new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name,
    namespace: "default",
    uid: `${name}-uid`,
    resourceVersion: "1",
    selfLink: `/api/v1/namespaces/default/pods/${name}`,
  },
  spec: {
    containers: [{
      name: "main",
      image: "some-image",
      resources: { requests: { cpu, memory }, limits: { cpu, memory }},
    }],
  },
  status: {
    phase,
    conditions: [],
    hostIP: "10.0.0.1",
    podIP: "10.0.0.2",
    startTime: "2026-10-28T00:00:00Z",
  },
});

describe("computeClusterResourceSummary", () => {
  const nodes = [createNode("node-1", true, "apps"), createNode("node-2", false, "system")];
  const pods = [
    createPod("running", "Running", "500m", "1Gi"),
    createPod("pending", "Pending", "250m", "512Mi"),
    createPod("done", "Succeeded", "4", "8Gi"),
    createPod("broken", "Failed", "4", "8Gi"),
  ];

  it("counts nodes, node pools and pods", () => {
    const { nodes: nodeSummary, pods: podSummary } = computeClusterResourceSummary(nodes, pods);

    expect(nodeSummary).toEqual({ total: 2, ready: 1, pools: 2 });
    expect(podSummary).toEqual({ total: 4, running: 1, pending: 1, succeeded: 1, failed: 1 });
  });

  it("adds up capacity and the requests of pods that are not finished", () => {
    const { points, hasUsage } = computeClusterResourceSummary(nodes, pods);

    expect(hasUsage).toBe(false);
    expect(points).toMatchObject({
      cpuUsage: undefined,
      cpuRequests: 0.75,
      cpuLimits: 0.75,
      cpuAllocatableCapacity: 7.8,
      cpuCapacity: 8,
      memoryUsage: undefined,
      memoryRequests: 1.5 * 1024 ** 3,
      memoryAllocatableCapacity: 30 * 1024 ** 3,
      podUsage: 2,
      podAllocatableCapacity: 200,
      podCapacity: 220,
    });
  });

  it("uses the usage from metrics-server of the listed nodes", () => {
    const usage = new Map([
      ["node-1", { cpu: 1.5, memory: 4 * 1024 ** 3 }],
      ["node-2", { cpu: 0.5, memory: 1024 ** 3 }],
      ["removed-node", { cpu: 10, memory: 10 }],
    ]);
    const { points, hasUsage } = computeClusterResourceSummary(nodes, pods, usage);

    expect(hasUsage).toBe(true);
    expect(points.cpuUsage).toBe(2);
    expect(points.memoryUsage).toBe(5 * 1024 ** 3);
  });
});
