/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { LogSearchStore } from "./log-search-store";

const logSearchStoreInjectable = getInjectable({
  id: "log-search-store",
  instantiate: () => new LogSearchStore(),
  lifecycle: lifecycleEnum.transient,
});

export default logSearchStoreInjectable;
