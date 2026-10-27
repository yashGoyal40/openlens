/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { LogTabData } from "./tab-store";
import type { IComputedValue } from "mobx";
import { computed, runInAction } from "mobx";
import moment from "moment-timezone";
import type { TabId } from "../dock/store";
import type { Pod } from "@k8slens/kube-object";
import { isDefined } from "@k8slens/utilities";
import assert from "assert";
import type { GetPodById } from "../../workloads-pods/get-pod-by-id.injectable";
import type { GetPodsByOwnerId } from "../../workloads-pods/get-pods-by-owner-id.injectable";
import type { LoadLogs } from "./load-logs.injectable";
import type { ResourceDescriptor } from "@k8slens/kube-api";
import type { LogSearchStore } from "./log-search-store";
import type { PodLogsRequestQuery } from "./call-for-logs.injectable";
import { createLogSearchMatcher, lineMatches } from "./log-search-matcher";

export interface LogTabViewModelDependencies {
  getLogs: (tabId: TabId) => string[];
  getLogsWithoutTimestamps: (tabId: TabId) => string[];
  getTimestampSplitLogs: (tabId: TabId) => [string, string][];
  getLogTabData: (tabId: TabId) => LogTabData | undefined;
  setLogTabData: (tabId: TabId, data: LogTabData) => void;
  loadLogs: LoadLogs;
  reloadLogs: (tabId: TabId, pod: IComputedValue<Pod | undefined>, logTabData: IComputedValue<LogTabData | undefined>) => Promise<void>;
  renameTab: (tabId: TabId, title: string) => void;
  stopLoadingLogs: (tabId: TabId) => void;
  getPodById: GetPodById;
  getPodsByOwnerId: GetPodsByOwnerId;
  areLogsPresent: (tabId: TabId) => boolean;
  downloadLogs: (filename: string, logs: string[]) => void;
  downloadAllLogs: (params: ResourceDescriptor, query: PodLogsRequestQuery, containers?: string[]) => Promise<void>;
  getLocaleTimezone: () => string;
  searchStore: LogSearchStore;
}

export class LogTabViewModel {
  constructor(protected readonly tabId: TabId, private readonly dependencies: LogTabViewModelDependencies) {}

  get searchStore() {
    return this.dependencies.searchStore;
  }

  readonly isLoading = computed(() => this.dependencies.areLogsPresent(this.tabId));
  readonly logs = computed(() => this.dependencies.getLogs(this.tabId));
  readonly logsWithoutTimestamps = computed(() => this.dependencies.getLogsWithoutTimestamps(this.tabId));
  readonly timestampSplitLogs = computed(() => this.dependencies.getTimestampSplitLogs(this.tabId));
  readonly logTabData = computed(() => this.dependencies.getLogTabData(this.tabId));
  readonly pods = computed(() => {
    const data = this.logTabData.get();

    if (!data) {
      return [];
    }

    if (typeof data.owner?.uid === "string") {
      return this.dependencies.getPodsByOwnerId(data.owner.uid);
    }

    return [this.dependencies.getPodById(data.selectedPodId)].filter(isDefined);
  });
  readonly pod = computed(() => {
    const data = this.logTabData.get();

    if (!data) {
      return undefined;
    }

    return this.dependencies.getPodById(data.selectedPodId);
  });

  /**
   * All loaded log lines as they are displayed, with or without (localized) timestamps
   */
  readonly displayedLogs = computed((): string[] => {
    if (!this.logTabData.get()?.showTimestamps) {
      return this.logsWithoutTimestamps.get();
    }

    const timezone = this.dependencies.getLocaleTimezone();

    return this.timestampSplitLogs
      .get()
      .map(([logTimestamp, log]) => (`${logTimestamp && moment.tz(logTimestamp, timezone).format()}${log}`));
  });

  /**
   * The regex for the current search query and options, `undefined` when there is no query
   */
  readonly searchMatcher = computed(() => {
    const data = this.logTabData.get();

    return createLogSearchMatcher(this.searchStore.searchQuery, {
      isRegex: data?.searchIsRegex ?? false,
      isCaseSensitive: data?.searchIsCaseSensitive ?? false,
    });
  });

  /**
   * Whether only the lines matching a (valid) search are shown
   */
  readonly isFilteringByMatch = computed(() => Boolean(
    this.logTabData.get()?.showOnlyMatching
    && this.searchMatcher.get()?.regex,
  ));

  /**
   * The indexes of the lines within {@link displayedLogs} which match the search, when filtering
   */
  readonly matchingLineIndexes = computed((): number[] | undefined => {
    const regex = this.searchMatcher.get()?.regex;

    if (!this.isFilteringByMatch.get() || !regex) {
      return undefined;
    }

    return this.displayedLogs
      .get()
      .flatMap((line, index) => lineMatches(line, regex) ? [index] : []);
  });

  /**
   * The log lines which are shown in the list
   */
  readonly visibleLogs = computed((): string[] => {
    const logs = this.displayedLogs.get();
    const indexes = this.matchingLineIndexes.get();

    return indexes
      ? indexes.map(index => logs[index])
      : logs;
  });

  updateLogTabData = (partialData: Partial<LogTabData>) => {
    const data = this.logTabData.get();

    assert(data, "Can only update data once it is set");

    this.dependencies.setLogTabData(this.tabId, { ...data, ...partialData });
  };

  /**
   * Searches the visible logs
   * @param query The new search query, defaults to the current one (eg. to refresh the results)
   */
  search = (query = this.searchStore.searchQuery) => {
    runInAction(() => {
      // The query needs to be set first because the regex and the visible logs depend on it
      this.searchStore.searchQuery = query;
      this.searchStore.searchWith(this.visibleLogs.get(), query, this.searchMatcher.get()?.regex);
    });
  };

  loadLogs = () => this.dependencies.loadLogs(this.tabId, this.pod, this.logTabData);
  reloadLogs = () => this.dependencies.reloadLogs(this.tabId, this.pod, this.logTabData);
  renameTab = (title: string) => this.dependencies.renameTab(this.tabId, title);
  stopLoadingLogs = () => this.dependencies.stopLoadingLogs(this.tabId);

  private getLogsToDownload(tabData: LogTabData) {
    return tabData.showTimestamps
      ? this.logs.get()
      : this.logsWithoutTimestamps.get();
  }

  downloadLogs = () => {
    const pod = this.pod.get();
    const tabData = this.logTabData.get();

    if (pod && tabData) {
      const fileName = pod.getName();

      this.dependencies.downloadLogs(`${fileName}.log`, this.getLogsToDownload(tabData));
    }
  };

  downloadFilteredLogs = () => {
    const pod = this.pod.get();
    const tabData = this.logTabData.get();
    const indexes = this.matchingLineIndexes.get();

    if (pod && tabData && indexes) {
      const logs = this.getLogsToDownload(tabData);

      this.dependencies.downloadLogs(`${pod.getName()}-filtered.log`, indexes.map(index => logs[index]));
    }
  };

  downloadAllLogs = () => {
    const pod = this.pod.get();
    const tabData = this.logTabData.get();

    if (pod && tabData) {
      const params = { name: pod.getName(), namespace: pod.getNs() };
      const query: PodLogsRequestQuery = { timestamps: tabData.showTimestamps, previous: tabData.showPrevious, container: tabData.selectedContainer };

      if (tabData.sinceSeconds) {
        query.sinceSeconds = tabData.sinceSeconds;
      }

      if (tabData.showAllContainers) {
        return this.dependencies.downloadAllLogs(params, query, pod.getContainers().map(container => container.name));
      }

      return this.dependencies.downloadAllLogs(params, query);
    }

    return;
  };
}
