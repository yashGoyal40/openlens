/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ViewTabsState } from "./view-tabs-state";
import { closeTab, openLocation } from "./view-tabs-state";

const ids = () => {
  let count = 0;

  return () => `tab-${++count}`;
};

const open = (state: ViewTabsState, pathname: string, title: string, search = "", createId = ids()) => (
  openLocation(state, { pathname, search, title }, createId)
);

describe("view tabs state", () => {
  it("opens the first view in a preview tab", () => {
    expect(open({ tabs: [] }, "/pods", "Pods")).toEqual({
      tabs: [{ id: "tab-1", pathname: "/pods", url: "/pods", title: "Pods", preview: true }],
      activeTabId: "tab-1",
    });
  });

  it("replaces the preview tab with the next view", () => {
    const state = open(open({ tabs: [] }, "/pods", "Pods"), "/nodes", "Nodes");

    expect(state.tabs).toEqual([{ id: "tab-1", pathname: "/nodes", url: "/nodes", title: "Nodes", preview: true }]);
  });

  it("opens a new preview tab next to a kept tab", () => {
    const createId = ids();
    const kept: ViewTabsState = {
      tabs: [
        { id: "a", pathname: "/pods", url: "/pods", title: "Pods", preview: false },
        { id: "b", pathname: "/secrets", url: "/secrets", title: "Secrets", preview: false },
      ],
      activeTabId: "a",
    };
    const state = open(kept, "/nodes", "Nodes", "", createId);

    expect(state.tabs.map(tab => tab.id)).toEqual(["a", "tab-1", "b"]);
    expect(state.activeTabId).toBe("tab-1");
  });

  it("activates the tab already showing a view and remembers its query", () => {
    const kept: ViewTabsState = {
      tabs: [
        { id: "a", pathname: "/pods", url: "/pods", title: "Pods", preview: false },
        { id: "b", pathname: "/nodes", url: "/nodes", title: "Nodes", preview: true },
      ],
      activeTabId: "b",
    };
    const state = open(kept, "/pods", "Pods", "?sort=name");

    expect(state.activeTabId).toBe("a");
    expect(state.tabs[0].url).toBe("/pods?sort=name");
    expect(state.tabs).toHaveLength(2);
  });

  it("keeps a preview tab open once details are opened from it", () => {
    const state = open(open({ tabs: [] }, "/pods", "Pods"), "/pods", "Pods", "?kube-details=%2Fapi%2Fv1%2Fpods");

    expect(state.tabs[0].preview).toBe(false);
  });

  describe("closing", () => {
    const state: ViewTabsState = {
      tabs: [
        { id: "a", pathname: "/a", url: "/a", title: "A", preview: false },
        { id: "b", pathname: "/b", url: "/b", title: "B", preview: false },
        { id: "c", pathname: "/c", url: "/c", title: "C", preview: false },
      ],
      activeTabId: "b",
    };

    it("shows the tab to the right of the closed active tab", () => {
      expect(closeTab(state, "b")).toEqual({
        state: { tabs: [state.tabs[0], state.tabs[2]], activeTabId: "c" },
        next: state.tabs[2],
      });
    });

    it("shows the tab to the left when the last tab is closed", () => {
      expect(closeTab({ ...state, activeTabId: "c" }, "c").next).toBe(state.tabs[1]);
    });

    it("keeps the active tab when another tab is closed", () => {
      expect(closeTab(state, "a")).toEqual({
        state: { tabs: [state.tabs[1], state.tabs[2]], activeTabId: "b" },
      });
    });

    it("has nothing to show after the only tab is closed", () => {
      expect(closeTab({ tabs: [state.tabs[0]], activeTabId: "a" }, "a")).toEqual({
        state: { tabs: [], activeTabId: undefined },
        next: undefined,
      });
    });
  });
});
