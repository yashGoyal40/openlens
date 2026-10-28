/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { getInjectable } from "@ogre-tools/injectable";
import { sidebarItemInjectionToken } from "@k8slens/cluster-sidebar";
import { Icon } from "@k8slens/icon";
import routeIsActiveInjectable from "../../../renderer/routes/route-is-active.injectable";
import costMonitoringRouteInjectable from "../common/cost-monitoring-route.injectable";
import navigateToCostMonitoringInjectable from "../common/navigate-to-cost-monitoring.injectable";

const costMonitoringSidebarItemInjectable = getInjectable({
  id: "sidebar-item-cost-monitoring",

  instantiate: (di) => {
    const route = di.inject(costMonitoringRouteInjectable);

    return {
      parentId: null,
      title: "Cost Monitoring",
      getIcon: () => <Icon material="payments" />,
      onClick: di.inject(navigateToCostMonitoringInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 115,
      isNew: true,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default costMonitoringSidebarItemInjectable;
