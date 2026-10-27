/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import costMonitoringRouteInjectable from "./cost-monitoring-route.injectable";

const navigateToCostMonitoringInjectable = getInjectable({
  id: "navigate-to-cost-monitoring",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(costMonitoringRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToCostMonitoringInjectable;
