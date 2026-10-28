/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import welcomeRouteConfigInjectable from "./welcome/welcome-route-config.injectable";
import welcomeRouteInjectable from "./welcome/welcome-route.injectable";
import catalogRouteInjectable from "./catalog/catalog-route.injectable";

/**
 * The page the app starts on and the home button opens: the catalog, unless the
 * application is configured with its own welcome page
 */
const homeRouteInjectable = getInjectable({
  id: "home-route",

  instantiate: (di) => (
    di.inject(welcomeRouteConfigInjectable) === "/welcome"
      ? di.inject(catalogRouteInjectable)
      : di.inject(welcomeRouteInjectable)
  ),
});

export default homeRouteInjectable;
