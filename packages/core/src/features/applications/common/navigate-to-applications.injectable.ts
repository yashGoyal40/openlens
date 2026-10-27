/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import type { ApplicationsPathParameters } from "./applications-route.injectable";
import applicationsRouteInjectable from "./applications-route.injectable";

/**
 * Navigates to the applications list, opening the details of an application when given one
 */
export type NavigateToApplications = (parameters?: ApplicationsPathParameters) => void;

const navigateToApplicationsInjectable = getInjectable({
  id: "navigate-to-applications",

  instantiate: (di): NavigateToApplications => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(applicationsRouteInjectable);

    return (parameters) => navigateToRoute(route, { parameters });
  },
});

export default navigateToApplicationsInjectable;
