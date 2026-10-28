/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { onLoadOfApplicationInjectionToken } from "@k8slens/application";
import { action } from "mobx";
import loadHotbarStorageInjectable from "./load-storage.injectable";
import hotbarsInjectable from "../common/hotbars.injectable";
import welcomeCatalogEntityInjectable from "../../../../common/catalog-entities/general-catalog-entities/implementations/welcome-catalog-entity.injectable";

/**
 * The catalog replaced the welcome page as the home page, so its hotbar item is dropped and
 * the items after it move up
 */
const removeWelcomePageFromHotbarsInjectable = getInjectable({
  id: "remove-welcome-page-from-hotbars",
  instantiate: (di) => ({
    run: action(() => {
      const hotbars = di.inject(hotbarsInjectable);
      const welcomePageId = di.inject(welcomeCatalogEntityInjectable).metadata.uid;

      for (const hotbar of hotbars.get()) {
        const index = hotbar.items.findIndex(item => item?.entity.uid === welcomePageId);

        if (index >= 0) {
          hotbar.items.splice(index, 1);
          hotbar.items.push(null);
        }
      }
    }),
    runAfter: loadHotbarStorageInjectable,
  }),
  injectionToken: onLoadOfApplicationInjectionToken,
});

export default removeWelcomePageFromHotbarsInjectable;
