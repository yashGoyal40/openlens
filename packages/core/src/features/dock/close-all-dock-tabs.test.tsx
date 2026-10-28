/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { DockStore } from "../../renderer/components/dock/dock/store";
import { TabKind } from "../../renderer/components/dock/dock/store";
import dockStoreInjectable from "../../renderer/components/dock/dock/store.injectable";

describe("closing all dock tabs", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let dockStore: DockStore;

  beforeEach(async () => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.afterWindowStart(({ windowDi }) => {
      dockStore = windowDi.inject(dockStoreInjectable);
      dockStore.createTab({ id: "some-tab", kind: TabKind.CREATE_RESOURCE, title: "Some tab" });
      dockStore.createTab({ id: "some-other-tab", kind: TabKind.CREATE_RESOURCE, title: "Some other tab" });
      // only the tab strip is needed, not the contents of the tabs
      dockStore.close();
    });

    result = await builder.render();
  });

  it("closes every tab from the dock toolbar", () => {
    expect(dockStore.tabs.map(tab => tab.id)).toEqual(expect.arrayContaining(["some-tab", "some-other-tab"]));

    fireEvent.click(result.getByTestId("dock-close-all-tabs"));

    expect(dockStore.tabs).toEqual([]);
  });
});
