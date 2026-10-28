/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { getInjectable } from "@ogre-tools/injectable";
import { sidebarItemInjectionToken } from "@k8slens/cluster-sidebar";
import { Icon } from "@k8slens/icon";
import routeIsActiveInjectable from "../../../renderer/routes/route-is-active.injectable";
import applicationsRouteInjectable from "../common/applications-route.injectable";
import navigateToApplicationsInjectable from "../common/navigate-to-applications.injectable";

const applicationsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-applications",

  instantiate: (di) => {
    const route = di.inject(applicationsRouteInjectable);
    const navigateToApplications = di.inject(navigateToApplicationsInjectable);

    return {
      parentId: null,
      title: "Applications",
      getIcon: () => <Icon material="apps" />,
      onClick: () => navigateToApplications(),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      // Between Workloads (20) and Config (40)
      orderNumber: 12,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default applicationsSidebarItemInjectable;
