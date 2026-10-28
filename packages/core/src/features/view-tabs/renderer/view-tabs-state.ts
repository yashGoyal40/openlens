/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface ViewTab {
  id: string;
  /**
   * Tabs are matched by path, so a view is never open twice
   */
  pathname: string;
  /**
   * The last location seen in this tab, including the query (eg. the open details)
   */
  url: string;
  title: string;
  /**
   * A preview tab is replaced by the next view that is opened, like a preview editor tab.
   * It is kept open by double clicking it or by opening details from it.
   */
  preview: boolean;
}

export interface ViewTabsState {
  tabs: ViewTab[];
  activeTabId?: string;
}

export interface OpenedLocation {
  pathname: string;
  search: string;
  title: string;
}

const detailsParam = "kube-details";

const hasOpenDetails = (search: string) => new URLSearchParams(search).has(detailsParam);

/**
 * Computes the tabs after `location` was opened
 */
export const openLocation = (state: ViewTabsState, location: OpenedLocation, createId: () => string): ViewTabsState => {
  const { pathname, search, title } = location;
  const url = `${pathname}${search}`;
  const keepOpen = hasOpenDetails(search);
  const existing = state.tabs.find(tab => tab.pathname === pathname);

  if (existing) {
    return {
      tabs: state.tabs.map(tab => (
        tab === existing
          ? { ...tab, url, title, preview: tab.preview && !keepOpen }
          : tab
      )),
      activeTabId: existing.id,
    };
  }

  const preview = state.tabs.find(tab => tab.preview);

  if (preview) {
    return {
      tabs: state.tabs.map(tab => (
        tab === preview
          ? { ...tab, pathname, url, title, preview: !keepOpen }
          : tab
      )),
      activeTabId: preview.id,
    };
  }

  const tab: ViewTab = { id: createId(), pathname, url, title, preview: !keepOpen };
  const activeIndex = state.tabs.findIndex(({ id }) => id === state.activeTabId);
  const tabs = [...state.tabs];

  tabs.splice(activeIndex + 1 || tabs.length, 0, tab);

  return { tabs, activeTabId: tab.id };
};

/**
 * Computes the tabs after closing the tab `tabId`, and which tab is shown next if it was the active one
 */
export const closeTab = (state: ViewTabsState, tabId: string): { state: ViewTabsState; next?: ViewTab } => {
  const index = state.tabs.findIndex(tab => tab.id === tabId);

  if (index < 0) {
    return { state };
  }

  const tabs = state.tabs.filter(tab => tab.id !== tabId);

  if (state.activeTabId !== tabId) {
    return { state: { tabs, activeTabId: state.activeTabId }};
  }

  const next = tabs[index] ?? tabs[index - 1];

  return {
    state: { tabs, activeTabId: next?.id },
    next,
  };
};
