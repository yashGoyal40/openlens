/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { PodMetrics } from "@k8slens/kube-object";
import { cpuUnitsToNumber, unitsToBytes } from "@k8slens/utilities";

/**
 * One pod as reported by metrics-server (metrics.k8s.io)
 */
export interface PodUsageReport {
  name: string;
  namespace: string;
  timestamp: string;
  containers: {
    name: string;
    usage?: { cpu?: string; memory?: string };
  }[];
}

export interface ContainerUsage {
  /**
   * In cores
   */
  cpu: number;
  /**
   * In bytes
   */
  memory: number;
}

export interface PodUsageSample {
  /**
   * Milliseconds since epoch, when metrics-server took the sample
   */
  time: number;
  containers: Partial<Record<string, ContainerUsage>>;
}

/**
 * The usage of every pod of a namespace at one moment, so that the pods of a workload can be added up
 */
export interface NamespaceUsageSnapshot {
  /**
   * Milliseconds since epoch, when the snapshot was taken
   */
  time: number;
  pods: Partial<Record<string, ContainerUsage>>;
}

export type UsageResource = keyof ContainerUsage;

export interface UsagePoint {
  x: number;
  y: number;
}

/**
 * metrics-server keeps no history, so samples are only kept for as long as the longest range on offer
 */
export const maxUsageHistoryAge = 6 * 60 * 60 * 1000;

export const toPodUsageReport = (metrics: PodMetrics): PodUsageReport => ({
  name: metrics.getName(),
  namespace: metrics.getNs(),
  timestamp: metrics.timestamp,
  containers: metrics.containers,
});

export const getPodUsageKey = (namespace: string, name: string) => `${namespace}/${name}`;

export function toPodUsageSample(report: PodUsageReport): PodUsageSample | undefined {
  const time = new Date(report.timestamp).getTime();

  if (Number.isNaN(time)) {
    return undefined;
  }

  const containers: PodUsageSample["containers"] = {};

  for (const { name, usage } of report.containers ?? []) {
    containers[name] = {
      cpu: cpuUnitsToNumber(usage?.cpu ?? "0") ?? 0,
      memory: unitsToBytes(usage?.memory ?? "0"),
    };
  }

  return { time, containers };
}

/**
 * Adds a sample in time order, ignoring repeats of a sample already recorded and dropping samples that have aged out
 */
export function appendUsageSample(samples: PodUsageSample[], sample: PodUsageSample, now: number): PodUsageSample[] {
  const oldest = now - maxUsageHistoryAge;
  const kept = samples.filter(({ time }) => time >= oldest && time !== sample.time);

  if (sample.time >= oldest) {
    kept.push(sample);
  }

  return kept.sort((left, right) => left.time - right.time);
}

/**
 * The usage of one container, or of the whole pod when no container is given, since a point in time
 */
export function getUsagePoints(samples: PodUsageSample[], resource: UsageResource, { container, since }: { container?: string; since: number }): UsagePoint[] {
  return samples
    .filter(({ time }) => time >= since)
    .map(({ time, containers }) => {
      const usages = container === undefined
        ? Object.values(containers)
        : [containers[container]];

      return {
        x: time,
        y: usages.reduce((total, usage) => total + (usage?.[resource] ?? 0), 0),
      };
    });
}

const sumContainers = (sample: PodUsageSample): ContainerUsage => Object.values(sample.containers).reduce<ContainerUsage>(
  (total, usage) => ({
    cpu: total.cpu + (usage?.cpu ?? 0),
    memory: total.memory + (usage?.memory ?? 0),
  }),
  { cpu: 0, memory: 0 },
);

/**
 * Splits reports of many pods into one snapshot per namespace
 */
export function toNamespaceSnapshots(reports: PodUsageReport[], time: number): Map<string, NamespaceUsageSnapshot> {
  const snapshots = new Map<string, NamespaceUsageSnapshot>();

  for (const report of reports) {
    const sample = toPodUsageSample(report);

    if (!sample) {
      continue;
    }

    const snapshot = snapshots.get(report.namespace) ?? { time, pods: {}};

    snapshot.pods[report.name] = sumContainers(sample);
    snapshots.set(report.namespace, snapshot);
  }

  return snapshots;
}

export function appendUsageSnapshot(snapshots: NamespaceUsageSnapshot[], snapshot: NamespaceUsageSnapshot, now: number): NamespaceUsageSnapshot[] {
  const oldest = now - maxUsageHistoryAge;

  return [...snapshots.filter(({ time }) => time >= oldest && time < snapshot.time), snapshot];
}

/**
 * The usage of some pods added up, or of every pod in the namespace when no pods are given
 */
export function getCombinedUsagePoints(snapshots: NamespaceUsageSnapshot[], resource: UsageResource, { pods, since }: { pods?: string[]; since: number }): UsagePoint[] {
  return snapshots
    .filter(({ time }) => time >= since)
    .map(({ time, pods: usages }) => ({
      x: time,
      y: (pods ?? Object.keys(usages)).reduce((total, pod) => total + (usages[pod]?.[resource] ?? 0), 0),
    }));
}
