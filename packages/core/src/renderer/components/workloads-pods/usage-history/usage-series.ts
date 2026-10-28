/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { Container } from "@k8slens/kube-object";
import { cpuUnitsToNumber, unitsToBytes } from "@k8slens/utilities";
import type { MetricData } from "../../../../common/k8s-api/endpoints/metrics.api";
import { normalizeMetrics } from "../../../../common/k8s-api/endpoints/metrics.api";
import type { MetricsTab } from "../../chart/options";
import type { UsageSeries, UsageUnit } from "../../metrics-panel/usage-chart";
import type { NamespaceUsageSnapshot, PodUsageSample, UsageResource } from "./pod-usage-history";
import { getCombinedUsagePoints, getUsagePoints } from "./pod-usage-history";

export const usageColors = {
  cpu: "#3d90ce",
  memory: "#c93dce",
  requests: "#30b24d",
  limits: "#8f8f8f",
  capacity: "#8f8f8f",
  allocatable: "#e0a23d",
  networkReceive: "#64c5d6",
  networkTransmit: "#46cd9e",
  fsUsage: "#ffc63d",
  fsWrites: "#ff963d",
  fsReads: "#fff73d",
};

export const getUsageUnit = (tab: MetricsTab): UsageUnit => {
  switch (tab) {
    case "CPU":
      return "cores";
    case "Pods":
      return "count";
    default:
      return "bytes";
  }
};

export interface UsageWindow {
  since: number;
  end: number;
}

/**
 * metrics-server only reports CPU and memory
 */
const toResource = (tab: MetricsTab): UsageResource | undefined => {
  switch (tab) {
    case "CPU":
      return "cpu";
    case "Memory":
      return "memory";
    default:
      return undefined;
  }
};

export interface UsageLevel {
  label: string;
  value: number | undefined;
  color: string;
}

/**
 * A request, limit or capacity is a level, drawn across the whole window
 */
const toLevelSeries = ({ label, value, color }: UsageLevel, { since, end }: UsageWindow): UsageSeries => ({
  id: label,
  label,
  color,
  points: value === undefined
    ? []
    : [{ x: since, y: value }, { x: end, y: value }],
  dashed: true,
});

const getContainerResource = (values: Partial<Record<string, string>> | undefined, resource: UsageResource) => {
  const value = values?.[resource];

  if (value === undefined) {
    return undefined;
  }

  return resource === "cpu"
    ? cpuUnitsToNumber(value)
    : unitsToBytes(value);
};

/**
 * One pod, or one of its containers with its requests and limits
 */
export function getMetricsServerSeries(samples: PodUsageSample[], tab: MetricsTab, window: UsageWindow, container?: Container): UsageSeries[] {
  const resource = toResource(tab);

  if (!resource) {
    return [];
  }

  const usage: UsageSeries = {
    id: `${resource}-usage`,
    label: `${tab} Usage`,
    color: usageColors[resource],
    points: getUsagePoints(samples, resource, { container: container?.name, since: window.since }),
  };

  if (!container) {
    return [usage];
  }

  return [
    usage,
    toLevelSeries({
      label: `${tab} Requests`,
      value: getContainerResource(container.resources?.requests, resource),
      color: usageColors.requests,
    }, window),
    toLevelSeries({
      label: `${tab} Limits`,
      value: getContainerResource(container.resources?.limits, resource),
      color: usageColors.limits,
    }, window),
  ];
}

/**
 * Several pods added up, such as those of a workload, a namespace, or the nodes
 *
 * @param pods Which entries of the snapshots to add up, all of them when not given
 * @param levels Levels to draw next to the usage, by tab
 */
export function getCombinedMetricsServerSeries(
  snapshots: NamespaceUsageSnapshot[],
  tab: MetricsTab,
  window: UsageWindow,
  { pods, levels = {}}: { pods?: string[]; levels?: Partial<Record<MetricsTab, UsageLevel[]>> } = {},
): UsageSeries[] {
  const resource = toResource(tab);

  if (!resource) {
    return [];
  }

  return [
    {
      id: `${resource}-usage`,
      label: `${tab} Usage`,
      color: usageColors[resource],
      points: getCombinedUsagePoints(snapshots, resource, { pods, since: window.since }),
    },
    ...(levels[tab] ?? []).map(level => toLevelSeries(level, window)),
  ];
}

export interface PrometheusSeriesDefinition<Key extends string> {
  key: Key;
  label: string;
  color: string;
  dashed?: boolean;
}

const toPoints = (metric: MetricData | undefined) => (
  normalizeMetrics(metric).data.result[0]?.values ?? []
).map(([time, value]) => ({ x: time * 1000, y: parseFloat(value) }));

/**
 * Series from Prometheus, which knows more than metrics-server, such as the network and the filesystem
 */
export function getPrometheusSeries<Key extends string>(
  metrics: Partial<Record<Key, MetricData>>,
  tab: MetricsTab,
  definitions: Partial<Record<MetricsTab, PrometheusSeriesDefinition<Key>[]>>,
): UsageSeries[] {
  return (definitions[tab] ?? []).map(({ key, label, color, dashed }) => ({
    id: key,
    label,
    color,
    points: toPoints(metrics[key]),
    dashed,
  }));
}

export type PodMetricKey = "cpuUsage" | "cpuRequests" | "cpuLimits" | "memoryUsage" | "memoryRequests" | "memoryLimits"
  | "networkReceive" | "networkTransmit" | "fsUsage" | "fsWrites" | "fsReads";

/**
 * For pods and for workloads, which Prometheus reports as the sum of their pods
 */
export const podPrometheusSeriesDefinitions: Partial<Record<MetricsTab, PrometheusSeriesDefinition<PodMetricKey>[]>> = {
  CPU: [{ key: "cpuUsage", label: "CPU Usage", color: usageColors.cpu }],
  Memory: [{ key: "memoryUsage", label: "Memory Usage", color: usageColors.memory }],
  Network: [
    { key: "networkReceive", label: "Receive", color: usageColors.networkReceive },
    { key: "networkTransmit", label: "Transmit", color: usageColors.networkTransmit },
  ],
  Filesystem: [
    { key: "fsUsage", label: "Usage", color: usageColors.fsUsage },
    { key: "fsWrites", label: "Writes", color: usageColors.fsWrites },
    { key: "fsReads", label: "Reads", color: usageColors.fsReads },
  ],
};

/**
 * For containers, with their requests and limits
 */
export const containerPrometheusSeriesDefinitions: Partial<Record<MetricsTab, PrometheusSeriesDefinition<PodMetricKey>[]>> = {
  ...podPrometheusSeriesDefinitions,
  CPU: [
    { key: "cpuUsage", label: "CPU Usage", color: usageColors.cpu },
    { key: "cpuRequests", label: "CPU Requests", color: usageColors.requests, dashed: true },
    { key: "cpuLimits", label: "CPU Limits", color: usageColors.limits, dashed: true },
  ],
  Memory: [
    { key: "memoryUsage", label: "Memory Usage", color: usageColors.memory },
    { key: "memoryRequests", label: "Memory Requests", color: usageColors.requests, dashed: true },
    { key: "memoryLimits", label: "Memory Limits", color: usageColors.limits, dashed: true },
  ],
};

type NodeMetricKey = "cpuUsage" | "cpuRequests" | "cpuCapacity" | "cpuAllocatableCapacity"
  | "memoryUsage" | "memoryRequests" | "memoryCapacity" | "memoryAllocatableCapacity"
  | "fsUsage" | "fsSize" | "podUsage" | "podCapacity";

export const nodePrometheusSeriesDefinitions: Partial<Record<MetricsTab, PrometheusSeriesDefinition<NodeMetricKey>[]>> = {
  CPU: [
    { key: "cpuUsage", label: "CPU Usage", color: usageColors.cpu },
    { key: "cpuRequests", label: "CPU Requests", color: usageColors.requests },
    { key: "cpuAllocatableCapacity", label: "Allocatable Capacity", color: usageColors.allocatable, dashed: true },
    { key: "cpuCapacity", label: "Capacity", color: usageColors.capacity, dashed: true },
  ],
  Memory: [
    { key: "memoryUsage", label: "Memory Usage", color: usageColors.memory },
    { key: "memoryRequests", label: "Memory Requests", color: usageColors.requests },
    { key: "memoryAllocatableCapacity", label: "Allocatable Capacity", color: usageColors.allocatable, dashed: true },
    { key: "memoryCapacity", label: "Capacity", color: usageColors.capacity, dashed: true },
  ],
  Disk: [
    { key: "fsUsage", label: "Disk Usage", color: usageColors.fsUsage },
    { key: "fsSize", label: "Size", color: usageColors.capacity, dashed: true },
  ],
  Pods: [
    { key: "podUsage", label: "Pods", color: usageColors.cpu },
    { key: "podCapacity", label: "Capacity", color: usageColors.capacity, dashed: true },
  ],
};
