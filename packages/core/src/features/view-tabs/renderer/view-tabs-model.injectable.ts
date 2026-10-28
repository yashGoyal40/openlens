/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, reaction, toJS } from "mobx";
import { observableHistoryInjectionToken } from "@k8slens/routing";
import viewTabsStorageInjectable from "./view-tabs-storage.injectable";
import getCurrentViewTitleInjectable from "./current-view-title.injectable";
import navigateInjectable from "../../../renderer/navigation/navigate.injectable";
import startUrlInjectable from "../../../renderer/frames/cluster-frame/start-url.injectable";
import type { ViewTab } from "./view-tabs-state";
import { closeTab, openLocation } from "./view-tabs-state";

export interface ViewTabsModel {
  readonly tabs: ViewTab[];
  readonly activeTabId: string | undefined;
  /**
   * Keeps the tabs in sync with the location, returns the disposer
   */
  track: () => () => void;
  activate: (tab: ViewTab) => void;
  keepOpen: (tab: ViewTab) => void;
  close: (tab: ViewTab) => void;
  closeOthers: (tab: ViewTab) => void;
}

const viewTabsModelInjectable = getInjectable({
  id: "view-tabs-model",

  instantiate: (di): ViewTabsModel => {
    const storage = di.inject(viewTabsStorageInjectable);
    const observableHistory = di.inject(observableHistoryInjectionToken);
    const getCurrentViewTitle = di.inject(getCurrentViewTitleInjectable);
    const navigate = di.inject(navigateInjectable);
    const startUrl = di.inject(startUrlInjectable);

    const tabs = computed(() => storage.get().tabs ?? []);
    const activeTabId = computed(() => storage.get().activeTabId);

    const trackLocation = () => reaction(
      () => {
        const { pathname, search } = observableHistory.location;

        return { pathname, search };
      },
      action(({ pathname, search }) => {
        const state = toJS(storage.get());
        // ids only need to be unique within the tabs of a cluster
        const nextId = () => String(Math.max(0, ...state.tabs.map(({ id }) => parseInt(id, 10) || 0)) + 1);

        storage.set(openLocation(state, {
          pathname,
          search,
          title: getCurrentViewTitle(pathname),
        }, nextId));
      }),
      {
        fireImmediately: true,
        equals: (left, right) => left.pathname === right.pathname && left.search === right.search,
      },
    );

    const showNextOrStart = (next: ViewTab | undefined) => {
      navigate(next?.url ?? startUrl.get());
    };

    return {
      get tabs() {
        return tabs.get();
      },
      get activeTabId() {
        return activeTabId.get();
      },
      track: () => {
        const { tabs: openTabs = [], activeTabId: lastActiveTabId } = storage.get();
        const lastActiveTab = openTabs.find(({ id }) => id === lastActiveTabId);
        const { pathname } = observableHistory.location;

        // a cluster that is opened again starts on the view it was left on
        if (lastActiveTab && (pathname === "/" || pathname === startUrl.get()) && lastActiveTab.pathname !== pathname) {
          navigate(lastActiveTab.url);
        }

        return trackLocation();
      },
      activate: (tab) => navigate(tab.url),
      keepOpen: action((tab) => {
        storage.merge(draft => {
          const found = draft.tabs.find(({ id }) => id === tab.id);

          if (found) {
            found.preview = false;
          }
        });
      }),
      close: action((tab) => {
        const { state, next } = closeTab(toJS(storage.get()), tab.id);

        storage.set(state);

        if (next || state.tabs.length === 0) {
          showNextOrStart(next);
        }
      }),
      closeOthers: action((tab) => {
        storage.set({
          tabs: toJS(tabs.get()).filter(({ id }) => id === tab.id),
          activeTabId: tab.id,
        });
        navigate(tab.url);
      }),
    };
  },
});

export default viewTabsModelInjectable;
