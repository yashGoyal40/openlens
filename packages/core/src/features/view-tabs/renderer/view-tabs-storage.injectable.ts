/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../renderer/utils/create-storage/create-storage.injectable";
import type { ViewTabsState } from "./view-tabs-state";

const viewTabsStorageInjectable = getInjectable({
  id: "view-tabs-storage",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    // stored per cluster, as the cluster frame has its own storage
    return createStorage<ViewTabsState>("view_tabs", { tabs: [] });
  },
});

export default viewTabsStorageInjectable;
