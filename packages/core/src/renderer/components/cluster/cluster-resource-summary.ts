/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { Node, Pod } from "@k8slens/kube-object";
import { cpuUnitsToNumber, unitsToBytes } from "@k8slens/utilities";
import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { NodeUsage } from "../nodes/request-node-usage.injectable";
import { getNodePool } from "../nodes/node-pool";

export type ClusterResourcePoints = Partial<Record<keyof ClusterMetricData, number>>;

export interface ClusterResourceSummary {
  nodes: { total: number; ready: number; pools: number };
  pods: { total: number; running: number; pending: number; succeeded: number; failed: number };
  /**
   * The same values Prometheus provides for the cluster pie charts
   */
  points: ClusterResourcePoints;
  /**
   * If metrics-server reported the current usage
   */
  hasUsage: boolean;
}

const cores = (value: string | undefined) => (value ? cpuUnitsToNumber(value) ?? 0 : 0);
const bytes = (value: string | undefined) => (value ? unitsToBytes(value) : 0);
const count = (value: string | undefined) => (value ? parseInt(value, 10) || 0 : 0);
const sum = <T>(items: T[], getValue: (item: T) => number) => items.reduce((total, item) => total + getValue(item), 0);

const isReady = (node: Node) => Boolean(node.status?.conditions?.some(({ type, status }) => type === "Ready" && status === "True"));

/**
 * Cluster totals from the nodes and pods, with usage from metrics-server, for clusters without Prometheus
 */
export const computeClusterResourceSummary = (nodes: Node[], pods: Pod[], usage?: Map<string, NodeUsage>): ClusterResourceSummary => {
  const phaseOf = (pod: Pod) => pod.getStatusPhase();
  const activePods = pods.filter(pod => phaseOf(pod) !== "Succeeded" && phaseOf(pod) !== "Failed");
  const containers = activePods.flatMap(pod => pod.getContainers());
  const nodeUsage = nodes.flatMap(node => {
    const current = usage?.get(node.getName());

    return current ? [current] : [];
  });
  const hasUsage = nodeUsage.length > 0;

  return {
    nodes: {
      total: nodes.length,
      ready: nodes.filter(isReady).length,
      pools: new Set(nodes.map(getNodePool).filter(Boolean)).size,
    },
    pods: {
      total: pods.length,
      running: pods.filter(pod => phaseOf(pod) === "Running").length,
      pending: pods.filter(pod => phaseOf(pod) === "Pending").length,
      succeeded: pods.filter(pod => phaseOf(pod) === "Succeeded").length,
      failed: pods.filter(pod => phaseOf(pod) === "Failed").length,
    },
    points: {
      cpuUsage: hasUsage ? sum(nodeUsage, ({ cpu }) => cpu) : undefined,
      cpuRequests: sum(containers, ({ resources }) => cores(resources?.requests?.cpu)),
      cpuLimits: sum(containers, ({ resources }) => cores(resources?.limits?.cpu)),
      cpuAllocatableCapacity: sum(nodes, node => cores(node.status?.allocatable?.cpu)),
      cpuCapacity: sum(nodes, node => cores(node.status?.capacity?.cpu)),
      memoryUsage: hasUsage ? sum(nodeUsage, ({ memory }) => memory) : undefined,
      memoryRequests: sum(containers, ({ resources }) => bytes(resources?.requests?.memory)),
      memoryLimits: sum(containers, ({ resources }) => bytes(resources?.limits?.memory)),
      memoryAllocatableCapacity: sum(nodes, node => bytes(node.status?.allocatable?.memory)),
      memoryCapacity: sum(nodes, node => bytes(node.status?.capacity?.memory)),
      podUsage: activePods.length,
      podAllocatableCapacity: sum(nodes, node => count(node.status?.allocatable?.pods)),
      podCapacity: sum(nodes, node => count(node.status?.capacity?.pods)),
    },
    hasUsage,
  };
};
