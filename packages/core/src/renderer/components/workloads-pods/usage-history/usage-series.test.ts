/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { Container } from "@k8slens/kube-object";
import { formatResources } from "../pod-details-container";
import { containerPrometheusSeriesDefinitions, getCombinedMetricsServerSeries, getMetricsServerSeries, getPrometheusSeries, podPrometheusSeriesDefinitions } from "./usage-series";

const samples = [
  { time: 1000, containers: { app: { cpu: 0.1, memory: 10 }}},
  { time: 2000, containers: { app: { cpu: 0.2, memory: 20 }}},
];

const container: Container = {
  name: "app",
  image: "some-image",
  resources: {
    requests: { cpu: "100m", memory: "64Mi" },
  },
};

describe("usage series", () => {
  describe("from metrics-server", () => {
    it("shows only the usage for the whole pod", () => {
      expect(getMetricsServerSeries(samples, "CPU", { since: 0, end: 3000 })).toEqual([
        expect.objectContaining({
          label: "CPU Usage",
          points: [{ x: 1000, y: 0.1 }, { x: 2000, y: 0.2 }],
        }),
      ]);
    });

    it("draws requests and limits of a container across the window", () => {
      const series = getMetricsServerSeries(samples, "Memory", { since: 0, end: 3000 }, container);

      expect(series.map(({ label, points }) => ({ label, points }))).toEqual([
        { label: "Memory Usage", points: [{ x: 1000, y: 10 }, { x: 2000, y: 20 }] },
        { label: "Memory Requests", points: [{ x: 0, y: 64 * 1024 * 1024 }, { x: 3000, y: 64 * 1024 * 1024 }] },
        { label: "Memory Limits", points: [] },
      ]);
    });

    it("has nothing for the network, which metrics-server does not report", () => {
      expect(getMetricsServerSeries(samples, "Network", { since: 0, end: 3000 })).toEqual([]);
    });
  });

  describe("from snapshots of a namespace", () => {
    const snapshots = [
      { time: 1000, pods: { "web-1": { cpu: 0.1, memory: 10 }, "web-2": { cpu: 0.2, memory: 20 }, "other": { cpu: 1, memory: 100 }}},
      { time: 2000, pods: { "web-1": { cpu: 0.3, memory: 30 }}},
    ];

    it("adds up the pods of a workload", () => {
      const [usage] = getCombinedMetricsServerSeries(snapshots, "Memory", { since: 0, end: 3000 }, { pods: ["web-1", "web-2"] });

      expect(usage).toEqual(expect.objectContaining({
        label: "Memory Usage",
        points: [{ x: 1000, y: 30 }, { x: 2000, y: 30 }],
      }));
    });

    it("adds up every pod of the namespace when no pods are given", () => {
      const [usage] = getCombinedMetricsServerSeries(snapshots, "Memory", { since: 0, end: 3000 });

      expect(usage.points).toEqual([{ x: 1000, y: 130 }, { x: 2000, y: 30 }]);
    });

    it("draws levels such as the capacity of a node", () => {
      const series = getCombinedMetricsServerSeries(snapshots, "CPU", { since: 500, end: 3000 }, {
        pods: ["web-1"],
        levels: { CPU: [{ label: "Capacity", value: 4, color: "grey" }] },
      });

      expect(series.map(({ label, points }) => ({ label, points }))).toEqual([
        { label: "CPU Usage", points: [{ x: 1000, y: 0.1 }, { x: 2000, y: 0.3 }] },
        { label: "Capacity", points: [{ x: 500, y: 4 }, { x: 3000, y: 4 }] },
      ]);
    });
  });

  describe("from Prometheus", () => {
    it("converts the timestamps to milliseconds", () => {
      const now = Math.floor(Date.now() / 1000);
      const series = getPrometheusSeries({
        cpuUsage: {
          status: "success",
          data: {
            resultType: "matrix",
            result: [{ metric: {}, values: [[now - 60, "0.5"]] }],
          },
        },
      }, "CPU", podPrometheusSeriesDefinitions);

      expect(series).toHaveLength(1);
      expect(series[0].points).toContainEqual({ x: (now - 60) * 1000, y: 0.5 });
    });

    it("adds requests and limits for containers", () => {
      expect(getPrometheusSeries({}, "Memory", containerPrometheusSeriesDefinitions).map(({ label }) => label)).toEqual([
        "Memory Usage",
        "Memory Requests",
        "Memory Limits",
      ]);
    });
  });

  describe("formatResources", () => {
    it("shows a dash for what is not set", () => {
      expect(formatResources(undefined)).toBe("CPU: —, Memory: —");
    });

    it("adds other resources after CPU and memory", () => {
      expect(formatResources({ "nvidia.com/gpu": "1", memory: "1Gi" })).toBe("CPU: —, Memory: 1Gi, nvidia.com/gpu: 1");
    });
  });
});
