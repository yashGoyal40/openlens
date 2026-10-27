/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { routeSpecificComponentInjectionToken } from "../../../renderer/routes/route-specific-component-injection-token";
import costMonitoringRouteInjectable from "../common/cost-monitoring-route.injectable";
import { CostMonitoring } from "./components/cost-monitoring";

const costMonitoringRouteComponentInjectable = getInjectable({
  id: "cost-monitoring-route-component",

  instantiate: (di) => ({
    route: di.inject(costMonitoringRouteInjectable),
    Component: CostMonitoring,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default costMonitoringRouteComponentInjectable;
