/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { callForMergedContainerLogs, mergeContainerLogs } from "../container-logs";
import type { CallForLogs } from "../call-for-logs.injectable";

describe("merging logs of containers", () => {
  it("prefixes the lines with the container name after the timestamp and sorts them chronologically", () => {
    expect(mergeContainerLogs([
      {
        container: "app",
        lines: [
          "2023-01-02T10:00:00.5Z app started",
          "2023-01-02T10:00:02Z app ready",
        ],
      },
      {
        container: "sidecar",
        lines: [
          "2023-01-02T10:00:00.123456789Z sidecar started",
          "2023-01-02T10:00:01.000000001Z sidecar ready",
        ],
      },
    ])).toEqual([
      "2023-01-02T10:00:00.123456789Z [sidecar] sidecar started",
      "2023-01-02T10:00:00.5Z [app] app started",
      "2023-01-02T10:00:01.000000001Z [sidecar] sidecar ready",
      "2023-01-02T10:00:02Z [app] app ready",
    ]);
  });

  it("keeps the order of lines with the same timestamp and lines without a timestamp", () => {
    expect(mergeContainerLogs([
      {
        container: "a",
        lines: [
          "2023-01-02T10:00:00Z first",
          "continuation of first",
          "2023-01-02T10:00:00Z second",
        ],
      },
      {
        container: "b",
        lines: [
          "2023-01-02T10:00:00Z third",
        ],
      },
    ])).toEqual([
      "2023-01-02T10:00:00Z [a] first",
      "[a] continuation of first",
      "2023-01-02T10:00:00Z [a] second",
      "2023-01-02T10:00:00Z [b] third",
    ]);
  });

  describe("callForMergedContainerLogs()", () => {
    const params = { name: "some-pod", namespace: "default" };

    it("requests the logs of each container with timestamps", async () => {
      const callForLogs = jest.fn<ReturnType<CallForLogs>, Parameters<CallForLogs>>(async (params, query) => `2023-01-02T10:00:00Z from ${query?.container}\n`);

      const lines = await callForMergedContainerLogs(callForLogs, params, ["a", "b"], { previous: true, sinceSeconds: 300 });

      expect(callForLogs.mock.calls).toEqual([
        [params, { previous: true, sinceSeconds: 300, timestamps: true, container: "a" }],
        [params, { previous: true, sinceSeconds: 300, timestamps: true, container: "b" }],
      ]);
      expect(lines).toEqual([
        "2023-01-02T10:00:00Z [a] from a",
        "2023-01-02T10:00:00Z [b] from b",
      ]);
    });

    it("skips containers whose logs can't be loaded", async () => {
      const callForLogs = jest.fn<ReturnType<CallForLogs>, Parameters<CallForLogs>>(async (params, query) => {
        if (query?.container === "a") {
          throw new Error("container is waiting to start");
        }

        return "2023-01-02T10:00:00Z ok";
      });

      expect(await callForMergedContainerLogs(callForLogs, params, ["a", "b"], {})).toEqual([
        "2023-01-02T10:00:00Z [b] ok",
      ]);
    });

    it("given logs of no container can be loaded, rejects", async () => {
      const error = new Error("some-error");
      const callForLogs = jest.fn<ReturnType<CallForLogs>, Parameters<CallForLogs>>(async () => {
        throw error;
      });

      await expect(callForMergedContainerLogs(callForLogs, params, ["a", "b"], {})).rejects.toBe(error);
    });
  });
});
