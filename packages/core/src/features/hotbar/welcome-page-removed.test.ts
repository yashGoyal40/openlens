/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import hotbarsInjectable from "./storage/common/hotbars.injectable";

describe("hotbar after the catalog became the home page", () => {
  let builder: ApplicationBuilder;

  const getHotbarEntityIds = () => builder.mainDi.inject(hotbarsInjectable)
    .get()
    .flatMap(hotbar => hotbar.items)
    .flatMap(item => (item ? [item.entity.uid] : []));

  beforeEach(async () => {
    builder = getApplicationBuilder();
    await builder.render();
  });

  it("no longer has the welcome page", () => {
    expect(getHotbarEntityIds()).not.toContain("welcome-page-entity");
  });

  it("moves the catalog up to the first cell", () => {
    expect(getHotbarEntityIds()[0]).toBe("catalog-entity");
  });
});
