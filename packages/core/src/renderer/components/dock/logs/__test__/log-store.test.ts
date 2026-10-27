/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import type { CallForLogs } from "../call-for-logs.injectable";
import { LogStore } from "../store";
import type { LogTabData } from "../tab-store";
import { logTabDataValidator } from "../log-tab-data.validator";
import { deploymentPod1, dockerPod } from "./pod.mock";

describe("LogStore", () => {
  let callForLogs: jest.MockedFunction<CallForLogs>;
  let store: LogStore;

  const baseTabData: LogTabData = {
    selectedPodId: dockerPod.getId(),
    selectedContainer: "docker-exporter",
    namespace: "default",
    showTimestamps: false,
    showPrevious: false,
  };

  beforeEach(() => {
    callForLogs = jest.fn();
    store = new LogStore({ callForLogs });
  });

  afterEach(() => {
    store.stopLoadingLogs("some-tab");
  });

  describe("given a 'since' is selected and showing previous container", () => {
    const tabData = computed((): LogTabData => ({ ...baseTabData, showPrevious: true, sinceSeconds: 900 }));
    const pod = computed(() => dockerPod);

    beforeEach(async () => {
      callForLogs.mockResolvedValue("2023-01-02T10:00:00Z some-log\n");
      await store.load("some-tab", pod, tabData);
    });

    it("requests the logs with sinceSeconds, previous and timestamps", () => {
      expect(callForLogs).toHaveBeenCalledWith(
        { name: "dockerExporter", namespace: "default" },
        { tailLines: 500, sinceSeconds: 900, previous: true, timestamps: true, container: "docker-exporter" },
      );
    });

    it("stores the logs", () => {
      expect(store.getLogs("some-tab")).toEqual(["2023-01-02T10:00:00Z some-log"]);
    });

    describe("when loading more logs", () => {
      beforeEach(async () => {
        callForLogs.mockClear();
        callForLogs.mockResolvedValue("2023-01-02T10:00:05Z newer-log\n");
        await store.loadMore("some-tab", pod, tabData);
      });

      it("requests the logs with sinceTime instead of sinceSeconds", () => {
        expect(callForLogs).toHaveBeenCalledWith(
          { name: "dockerExporter", namespace: "default" },
          { sinceTime: "2023-01-02T10:00:01.000Z", previous: true, timestamps: true, container: "docker-exporter" },
        );
        expect(callForLogs.mock.calls[0][1]).not.toHaveProperty("sinceSeconds");
      });

      it("appends the new logs", () => {
        expect(store.getLogs("some-tab")).toEqual([
          "2023-01-02T10:00:00Z some-log",
          "2023-01-02T10:00:05Z newer-log",
        ]);
      });
    });
  });

  describe("given no 'since' is selected", () => {
    beforeEach(async () => {
      callForLogs.mockResolvedValue("2023-01-02T10:00:00Z some-log\n");
      await store.load("some-tab", computed(() => dockerPod), computed(() => baseTabData));
    });

    it("doesn't send sinceSeconds", () => {
      expect(callForLogs.mock.calls[0][1]).not.toHaveProperty("sinceSeconds");
    });
  });

  describe("given showing all containers", () => {
    const tabData = computed((): LogTabData => ({
      ...baseTabData,
      selectedPodId: deploymentPod1.getId(),
      selectedContainer: "node-exporter",
      showAllContainers: true,
    }));

    beforeEach(async () => {
      callForLogs.mockImplementation(async (params, query) => (
        query?.container === "node-exporter"
          ? "2023-01-02T10:00:01Z second\n"
          : "2023-01-02T10:00:00Z first\n"
      ));
      await store.load("some-tab", computed(() => deploymentPod1), tabData);
    });

    it("requests the logs of every (non init) container", () => {
      expect(callForLogs.mock.calls.map(([, query]) => query?.container)).toEqual(["node-exporter", "node-exporter-1"]);
    });

    it("merges the logs with a container name prefix", () => {
      expect(store.getLogsWithoutTimestamps("some-tab")).toEqual([
        "[node-exporter-1] first",
        "[node-exporter] second",
      ]);
    });
  });
});

describe("log tab data validation", () => {
  it("accepts the new optional options", () => {
    expect(logTabDataValidator.validate({
      selectedPodId: "some-id",
      namespace: "default",
      selectedContainer: "some-container",
      showTimestamps: true,
      showPrevious: false,
      showAllContainers: true,
      sinceSeconds: 3600,
      wrapLines: true,
      showOnlyMatching: true,
      searchIsRegex: true,
      searchIsCaseSensitive: false,
    }).error).toBeUndefined();
  });

  it("accepts data persisted before the options existed", () => {
    expect(logTabDataValidator.validate({
      selectedPodId: "some-id",
      namespace: "default",
      selectedContainer: "some-container",
      showTimestamps: true,
      showPrevious: false,
    }).error).toBeUndefined();
  });

  it("rejects an invalid since", () => {
    expect(logTabDataValidator.validate({
      selectedPodId: "some-id",
      namespace: "default",
      showTimestamps: true,
      showPrevious: false,
      sinceSeconds: -1,
    }).error).toBeDefined();
  });
});
