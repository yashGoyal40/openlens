/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent, within } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import viewTabsStorageInjectable from "./renderer/view-tabs-storage.injectable";
import currentPathInjectable from "../../renderer/routes/current-path.injectable";

describe("view tabs in the cluster frame", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;

  const getTabs = () => within(result.getByTestId("view-tabs")).getAllByRole("tab");
  // the title of a tab is "<view> - <cluster>"
  const viewOf = (tab: HTMLElement | undefined) => tab?.title.split(" - ")[0];
  const getTabLabels = () => getTabs().map(viewOf);
  const getActiveTab = () => getTabs().find(tab => tab.getAttribute("aria-selected") === "true");
  const openFromNavigator = (...itemIds: string[]) => {
    for (const itemId of itemIds) {
      fireEvent.click(result.getByTestId(`link-for-${itemId}`));
    }
  };

  beforeEach(async () => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");
    builder.afterWindowStart(() => {
      builder.allowKubeResource({ apiName: "pods", group: "" });
      builder.allowKubeResource({ apiName: "deployments", group: "apps" });
    });

    result = await builder.render();
  });

  it("opens the start view in a preview tab", () => {
    expect(getTabLabels()).toEqual(["Workloads Overview"]);
    expect(getActiveTab()?.dataset.isPreviewTest).toBe("true");
  });

  describe("when pods are opened from the navigator", () => {
    beforeEach(() => {
      openFromNavigator("sidebar-item-workloads", "sidebar-item-pods");
    });

    it("shows pods in the preview tab instead of opening another tab", () => {
      expect(getTabLabels()).toEqual(["Pods"]);
    });

    describe("when the tab is double clicked and deployments are opened", () => {
      beforeEach(() => {
        fireEvent.doubleClick(getTabs()[0]);
        openFromNavigator("sidebar-item-deployments");
      });

      it("keeps pods open and shows deployments in a new preview tab", () => {
        expect(getTabLabels()).toEqual(["Pods", "Deployments"]);
        expect(getTabs().map(tab => tab.dataset.isPreviewTest)).toEqual(["false", "true"]);
        expect(viewOf(getActiveTab())).toBe("Deployments");
      });

      describe("when the pods tab is clicked", () => {
        beforeEach(() => {
          fireEvent.click(getTabs()[0]);
        });

        it("shows pods again", () => {
          expect(viewOf(getActiveTab())).toBe("Pods");
          expect(result.getByTestId("sidebar-item-pods").dataset.isActiveTest).toBe("true");
        });
      });

      describe("when the active deployments tab is closed", () => {
        beforeEach(() => {
          fireEvent.click(result.getByTestId(`close-${getTabs()[1].id}`));
        });

        it("shows the remaining pods tab", () => {
          expect(getTabLabels()).toEqual(["Pods"]);
          expect(viewOf(getActiveTab())).toBe("Pods");
        });
      });
    });
  });
});

describe("view tabs when a cluster is opened again", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let currentPath: () => string;

  const getTabLabels = () => within(result.getByTestId("view-tabs"))
    .getAllByRole("tab")
    .map(tab => tab.title.split(" - ")[0]);

  describe("given the cluster was left on the pods tab", () => {
    beforeEach(async () => {
      builder = getApplicationBuilder().setEnvironmentToClusterFrame();
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({ apiName: "pods", group: "" });
        windowDi.inject(viewTabsStorageInjectable).set({
          tabs: [{ id: "pods-tab", pathname: "/pods", url: "/pods", title: "Pods", preview: false }],
          activeTabId: "pods-tab",
        });
        currentPath = () => windowDi.inject(currentPathInjectable).get();
      });

      result = await builder.render();
    });

    it("opens the pods view again", () => {
      expect(currentPath()).toBe("/pods");
      expect(getTabLabels()).toEqual(["Pods"]);
    });
  });
});
