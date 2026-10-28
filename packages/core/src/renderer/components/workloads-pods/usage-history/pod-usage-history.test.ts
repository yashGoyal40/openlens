/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { PodUsageSample } from "./pod-usage-history";
import { appendUsageSample, appendUsageSnapshot, getUsagePoints, maxUsageHistoryAge, toNamespaceSnapshots, toPodUsageSample } from "./pod-usage-history";

const report = (timestamp: string) => ({
  name: "some-pod",
  namespace: "some-namespace",
  timestamp,
  containers: [
    { name: "app", usage: { cpu: "250m", memory: "128Mi" }},
    { name: "sidecar", usage: { cpu: "1500000n", memory: "1Ki" }},
  ],
});

const sample = (time: number, cpu = 0.1): PodUsageSample => ({
  time,
  containers: { app: { cpu, memory: 1024 }},
});

describe("pod usage history", () => {
  describe("toPodUsageSample", () => {
    it("converts the units of each container", () => {
      expect(toPodUsageSample(report("2026-10-28T10:00:00Z"))).toEqual({
        time: Date.parse("2026-10-28T10:00:00Z"),
        containers: {
          app: { cpu: 0.25, memory: 128 * 1024 * 1024 },
          sidecar: { cpu: 0.0015, memory: 1024 },
        },
      });
    });

    it("ignores a report without a valid timestamp", () => {
      expect(toPodUsageSample(report("not a date"))).toBeUndefined();
    });
  });

  describe("appendUsageSample", () => {
    const now = Date.parse("2026-10-28T10:00:00Z");

    it("keeps samples in time order", () => {
      const samples = appendUsageSample([sample(now - 1000)], sample(now - 2000), now);

      expect(samples.map(({ time }) => time)).toEqual([now - 2000, now - 1000]);
    });

    it("replaces a sample taken at the same time", () => {
      const samples = appendUsageSample([sample(now - 1000, 0.1)], sample(now - 1000, 0.2), now);

      expect(samples).toEqual([sample(now - 1000, 0.2)]);
    });

    it("drops samples that are too old to be shown", () => {
      const samples = appendUsageSample([sample(now - maxUsageHistoryAge - 1)], sample(now), now);

      expect(samples).toEqual([sample(now)]);
    });
  });

  describe("getUsagePoints", () => {
    const samples: PodUsageSample[] = [
      { time: 1000, containers: { app: { cpu: 0.1, memory: 10 }, sidecar: { cpu: 0.2, memory: 20 }}},
      { time: 2000, containers: { app: { cpu: 0.3, memory: 30 }}},
    ];

    it("sums the containers for the whole pod", () => {
      expect(getUsagePoints(samples, "memory", { since: 0 })).toEqual([
        { x: 1000, y: 30 },
        { x: 2000, y: 30 },
      ]);
    });

    it("picks one container, counting a missing sample as zero", () => {
      expect(getUsagePoints(samples, "cpu", { container: "sidecar", since: 0 })).toEqual([
        { x: 1000, y: 0.2 },
        { x: 2000, y: 0 },
      ]);
    });

    it("leaves out samples before the window", () => {
      expect(getUsagePoints(samples, "memory", { since: 1500 })).toEqual([
        { x: 2000, y: 30 },
      ]);
    });
  });

  describe("namespace snapshots", () => {
    it("adds up the containers of each pod, by namespace", () => {
      const snapshots = toNamespaceSnapshots([
        report("2026-10-28T10:00:00Z"),
        { ...report("2026-10-28T10:00:05Z"), name: "other-pod", namespace: "other-namespace" },
      ], 5000);

      expect(snapshots.get("some-namespace")).toEqual({
        time: 5000,
        pods: { "some-pod": { cpu: 0.2515, memory: 128 * 1024 * 1024 + 1024 }},
      });
      expect(Object.keys(snapshots.get("other-namespace")?.pods ?? {})).toEqual(["other-pod"]);
    });

    it("drops snapshots that are too old to be shown", () => {
      const now = maxUsageHistoryAge + 10_000;
      const snapshots = appendUsageSnapshot([{ time: 1, pods: {}}, { time: now - 1000, pods: {}}], { time: now, pods: {}}, now);

      expect(snapshots.map(({ time }) => time)).toEqual([now - 1000, now]);
    });
  });
});
