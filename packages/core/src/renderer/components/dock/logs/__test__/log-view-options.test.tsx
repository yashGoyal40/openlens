/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as selectEvent from "react-select-event";
import { observable, runInAction } from "mobx";
import assert from "assert";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import type { DiRender } from "../../../test-utils/renderFor";
import { renderFor } from "../../../test-utils/renderFor";
import type { LogTabViewModelDependencies } from "../logs-view-model";
import { LogTabViewModel } from "../logs-view-model";
import { LogSearchStore } from "../log-search-store";
import type { LogTabData } from "../tab-store";
import { LogControls } from "../controls";
import { LogList } from "../list";
import { LogSearch } from "../search";
import { dockerPod } from "./pod.mock";

describe("pod logs view options", () => {
  let render: DiRender;
  let tabData: { current: LogTabData };
  let reloadLogs: jest.MockedFunction<LogTabViewModelDependencies["reloadLogs"]>;
  let downloadLogs: jest.MockedFunction<LogTabViewModelDependencies["downloadLogs"]>;
  let model: LogTabViewModel;

  const logs = [
    "2023-01-02T10:00:00Z INFO server started",
    "2023-01-02T10:00:01Z WARN slow request",
    "2023-01-02T10:00:02Z level=error msg=\"request failed\"",
    "2023-01-02T10:00:03Z {\"level\":\"debug\",\"msg\":\"details\"}",
  ];

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);

    tabData = observable({
      current: {
        selectedPodId: dockerPod.getId(),
        selectedContainer: "docker-exporter",
        namespace: "default",
        showTimestamps: false,
        showPrevious: false,
      },
    }, { current: observable.ref });
    reloadLogs = jest.fn();
    downloadLogs = jest.fn();

    model = new LogTabViewModel("some-tab", {
      getLogs: () => logs,
      getLogsWithoutTimestamps: () => logs.map(line => line.replace(/^\S+ /, "")),
      getTimestampSplitLogs: () => logs.map(line => [line.slice(0, 20), line.slice(20)]),
      getLogTabData: () => tabData.current,
      setLogTabData: (tabId, data) => runInAction(() => tabData.current = data),
      loadLogs: jest.fn(),
      reloadLogs,
      renameTab: jest.fn(),
      stopLoadingLogs: jest.fn(),
      getPodById: () => dockerPod,
      getPodsByOwnerId: () => [dockerPod],
      areLogsPresent: () => false,
      downloadLogs,
      downloadAllLogs: jest.fn(),
      getLocaleTimezone: () => "UTC",
      searchStore: new LogSearchStore(),
    });
  });

  describe("controls", () => {
    it("when toggling 'Wrap lines', persists the option without reloading", () => {
      const { getByText } = render(<LogControls model={model} />);

      userEvent.click(getByText("Wrap lines"));

      expect(tabData.current.wrapLines).toBe(true);
      expect(reloadLogs).not.toHaveBeenCalled();
    });

    it("shows 'All' as the default 'since'", () => {
      const { container } = render(<LogControls model={model} />);

      expect(container.querySelector(".since-selector")).toHaveTextContent("All");
    });

    it("when selecting a 'since', persists it and reloads the logs", async () => {
      const { container, findByText } = render(<LogControls model={model} />);
      const selector = container.querySelector<HTMLElement>(".since-selector");

      assert(selector);
      selectEvent.openMenu(selector);
      userEvent.click(await findByText("15m"));

      expect(tabData.current.sinceSeconds).toBe(900);
      expect(reloadLogs).toHaveBeenCalled();
    });

    it("when selecting 'All' as since, removes the persisted value", async () => {
      model.updateLogTabData({ sinceSeconds: 3600 });

      const { container, findByText } = render(<LogControls model={model} />);
      const selector = container.querySelector<HTMLElement>(".since-selector");

      assert(selector);
      expect(selector).toHaveTextContent("1h");
      selectEvent.openMenu(selector);
      userEvent.click(await findByText("All"));

      expect(tabData.current.sinceSeconds).toBeUndefined();
    });

    it("given not filtering by the search, doesn't show the 'Filtered logs' download", () => {
      const { getByTestId, queryByTestId } = render(<LogControls model={model} />);

      userEvent.click(getByTestId("download-logs-dropdown"));

      expect(getByTestId("download-visible-logs")).toBeInTheDocument();
      expect(getByTestId("download-all-logs")).toBeInTheDocument();
      expect(queryByTestId("download-filtered-logs")).not.toBeInTheDocument();
    });

    it("given filtering by the search, downloads only the matching lines", () => {
      model.updateLogTabData({ showOnlyMatching: true });
      model.search("request");

      const { getByTestId } = render(<LogControls model={model} />);

      userEvent.click(getByTestId("download-logs-dropdown"));
      userEvent.click(getByTestId("download-filtered-logs"));

      expect(downloadLogs).toHaveBeenCalledWith("dockerExporter-filtered.log", [
        "WARN slow request",
        "level=error msg=\"request failed\"",
      ]);
    });
  });

  describe("list", () => {
    it("highlights the lines by their log level", () => {
      const { getByText } = render(<LogList model={model} />);

      expect(getByText("INFO server started").closest(".LogRow")?.className).toBe("LogRow");
      expect(getByText("WARN slow request").closest(".LogRow")).toHaveClass("level-warn");
      expect(getByText("level=error msg=\"request failed\"").closest(".LogRow")).toHaveClass("level-error");
      expect(getByText("{\"level\":\"debug\",\"msg\":\"details\"}").closest(".LogRow")).toHaveClass("level-debug");
    });

    it("given wrapping lines, wraps them", () => {
      model.updateLogTabData({ wrapLines: true });

      const { container } = render(<LogList model={model} />);

      expect(container.querySelector(".LogList")).toHaveClass("wrapLines");
    });

    it("given not wrapping lines, doesn't wrap them", () => {
      const { container } = render(<LogList model={model} />);

      expect(container.querySelector(".LogList")).not.toHaveClass("wrapLines");
    });

    it("given showing only matching lines, shows only them", () => {
      model.updateLogTabData({ showOnlyMatching: true });
      model.search("REQUEST");

      const { container } = render(<LogList model={model} />);

      expect([...container.querySelectorAll(".LogRow")].map(row => row.textContent)).toEqual([
        "WARN slow request",
        "level=error msg=\"request failed\"",
      ]);
      expect([...container.querySelectorAll(".LogRow .overlay")].map(overlay => overlay.textContent)).toEqual([
        "request",
        "request",
      ]);
    });

    it("given showing only matching lines and nothing matches, tells so", () => {
      model.updateLogTabData({ showOnlyMatching: true });
      model.search("nothing-matches-this");

      const { getByText } = render(<LogList model={model} />);

      expect(getByText("There are no log lines matching the search")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    const renderSearch = () => render(<LogSearch model={model} scrollToOverlay={jest.fn()} />);

    it.each([
      ["log-search-case-sensitive", "searchIsCaseSensitive"],
      ["log-search-regex", "searchIsRegex"],
      ["log-search-show-only-matching", "showOnlyMatching"],
    ] as const)("when clicking %s, toggles and persists %s", (testId, option) => {
      const { getByTestId } = renderSearch();

      userEvent.click(getByTestId(testId));
      expect(tabData.current[option]).toBe(true);
      expect(getByTestId(testId)).toHaveAttribute("aria-pressed", "true");

      userEvent.click(getByTestId(testId));
      expect(tabData.current[option]).toBe(false);
    });

    it("given regular expressions, finds the matches of the regex", () => {
      model.updateLogTabData({ searchIsRegex: true });

      const { getByPlaceholderText, getByText } = renderSearch();

      userEvent.type(getByPlaceholderText("Search..."), "WARN|error");

      expect(getByText("1 / 2")).toBeInTheDocument();
    });

    it("when toggling case sensitivity, updates the matches", () => {
      const { getByPlaceholderText, getByText, getByTestId } = renderSearch();

      userEvent.type(getByPlaceholderText("Search..."), "warn");
      expect(getByText("1 / 1")).toBeInTheDocument();

      act(() => userEvent.click(getByTestId("log-search-case-sensitive")));
      expect(model.searchStore.totalFinds).toBe(0);
    });

    it("given an invalid regular expression, shows an error", () => {
      model.updateLogTabData({ searchIsRegex: true });

      const { getByPlaceholderText, getByTestId } = renderSearch();

      userEvent.type(getByPlaceholderText("Search..."), "(");

      expect(getByTestId("log-search-error")).toBeInTheDocument();
    });
  });
});
