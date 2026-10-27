/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observable, runInAction } from "mobx";
import type { LogTabViewModelDependencies } from "../logs-view-model";
import { LogTabViewModel } from "../logs-view-model";
import { LogSearchStore } from "../log-search-store";
import type { LogTabData } from "../tab-store";
import { deploymentPod1 } from "./pod.mock";

describe("LogTabViewModel", () => {
  let tabData: { current: LogTabData };
  let downloadLogs: jest.MockedFunction<LogTabViewModelDependencies["downloadLogs"]>;
  let downloadAllLogs: jest.MockedFunction<LogTabViewModelDependencies["downloadAllLogs"]>;
  let model: LogTabViewModel;

  const logs = [
    "2023-01-02T10:00:00Z GET /health status=200",
    "2023-01-02T10:00:01Z GET /api status=503",
    "2023-01-02T10:00:02Z POST /api status=500",
  ];

  beforeEach(() => {
    tabData = observable({
      current: {
        selectedPodId: deploymentPod1.getId(),
        selectedContainer: "node-exporter",
        namespace: "default",
        showTimestamps: false,
        showPrevious: false,
      },
    }, { current: observable.ref });
    downloadLogs = jest.fn();
    downloadAllLogs = jest.fn();

    model = new LogTabViewModel("some-tab", {
      getLogs: () => logs,
      getLogsWithoutTimestamps: () => logs.map(line => line.replace(/^\S+ /, "")),
      getTimestampSplitLogs: () => logs.map(line => [line.slice(0, 20), line.slice(20)]),
      getLogTabData: () => tabData.current,
      setLogTabData: (tabId, data) => runInAction(() => tabData.current = data),
      loadLogs: jest.fn(),
      reloadLogs: jest.fn(),
      renameTab: jest.fn(),
      stopLoadingLogs: jest.fn(),
      getPodById: () => deploymentPod1,
      getPodsByOwnerId: () => [deploymentPod1],
      areLogsPresent: () => false,
      downloadLogs,
      downloadAllLogs,
      getLocaleTimezone: () => "Europe/Helsinki",
      searchStore: new LogSearchStore(),
    });
  });

  it("given showing timestamps, displays them in the locale timezone", () => {
    model.updateLogTabData({ showTimestamps: true });

    expect(model.displayedLogs.get()[0]).toBe("2023-01-02T12:00:00+02:00 GET /health status=200");
  });

  describe("given searching for a regular expression", () => {
    beforeEach(() => {
      model.updateLogTabData({ searchIsRegex: true });
      model.search("status=5\\d\\d");
    });

    it("finds the occurrences", () => {
      expect(model.searchStore.occurrences).toEqual([1, 2]);
    });

    it("shows all lines when not filtering", () => {
      expect(model.visibleLogs.get()).toHaveLength(3);
      expect(model.isFilteringByMatch.get()).toBe(false);
    });

    describe("when showing only matching lines", () => {
      beforeEach(() => {
        model.updateLogTabData({ showOnlyMatching: true });
        model.search();
      });

      it("shows only the matching lines", () => {
        expect(model.visibleLogs.get()).toEqual([
          "GET /api status=503",
          "POST /api status=500",
        ]);
      });

      it("finds the occurrences within the visible lines", () => {
        expect(model.searchStore.occurrences).toEqual([0, 1]);
      });

      it("when downloading filtered logs, downloads only the matching lines", () => {
        model.downloadFilteredLogs();

        expect(downloadLogs).toHaveBeenCalledWith("deploymentPod1-filtered.log", [
          "GET /api status=503",
          "POST /api status=500",
        ]);
      });

      it("given showing timestamps, when downloading filtered logs, downloads the matching lines with timestamps", () => {
        model.updateLogTabData({ showTimestamps: true });
        model.downloadFilteredLogs();

        expect(downloadLogs).toHaveBeenCalledWith("deploymentPod1-filtered.log", [
          "2023-01-02T10:00:01Z GET /api status=503",
          "2023-01-02T10:00:02Z POST /api status=500",
        ]);
      });

      it("given case sensitive search with different case, shows no lines", () => {
        model.updateLogTabData({ searchIsCaseSensitive: true });
        model.search("STATUS");

        expect(model.visibleLogs.get()).toEqual([]);
      });

      it("given an invalid regular expression, shows all lines", () => {
        model.search("status=(");

        expect(model.searchMatcher.get()?.error).toBeDefined();
        expect(model.isFilteringByMatch.get()).toBe(false);
        expect(model.visibleLogs.get()).toHaveLength(3);
      });
    });
  });

  describe("when downloading all logs", () => {
    it("requests the selected container", () => {
      model.downloadAllLogs();

      expect(downloadAllLogs).toHaveBeenCalledWith(
        { name: "deploymentPod1", namespace: "default" },
        { timestamps: false, previous: false, container: "node-exporter" },
      );
    });

    it("given a 'since' is selected, requests only that time range", () => {
      model.updateLogTabData({ sinceSeconds: 3600 });
      model.downloadAllLogs();

      expect(downloadAllLogs).toHaveBeenCalledWith(
        { name: "deploymentPod1", namespace: "default" },
        { timestamps: false, previous: false, container: "node-exporter", sinceSeconds: 3600 },
      );
    });

    it("given showing all containers, requests all (non init) containers", () => {
      model.updateLogTabData({ showAllContainers: true });
      model.downloadAllLogs();

      expect(downloadAllLogs).toHaveBeenCalledWith(
        { name: "deploymentPod1", namespace: "default" },
        { timestamps: false, previous: false, container: "node-exporter" },
        ["node-exporter", "node-exporter-1"],
      );
    });
  });
});
