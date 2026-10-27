/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { sidebarItemInjectionToken } from "@k8slens/cluster-sidebar";
import { routeSpecificComponentInjectionToken } from "../../../../renderer/routes/route-specific-component-injection-token";
import routeIsActiveInjectable from "../../../../renderer/routes/route-is-active.injectable";
import { navigateToSecurityOverviewInjectable, securityOverviewRouteInjectable } from "../../common/security-center-routes.injectable";
import securityCenterSidebarGroupInjectable from "../security-center-sidebar-group.injectable";
import { SecurityOverview } from "./security-overview";

export const securityOverviewRouteComponentInjectable = getInjectable({
  id: "security-center-overview-route-component",

  instantiate: (di) => ({
    route: di.inject(securityOverviewRouteInjectable),
    Component: SecurityOverview,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export const securityOverviewSidebarItemInjectable = getInjectable({
  id: "sidebar-item-security-center-overview",

  instantiate: (di) => {
    const route = di.inject(securityOverviewRouteInjectable);

    return {
      parentId: securityCenterSidebarGroupInjectable.id,
      title: "Overview",
      onClick: di.inject(navigateToSecurityOverviewInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 5,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});
