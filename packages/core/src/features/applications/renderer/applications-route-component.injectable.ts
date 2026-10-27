/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { routeSpecificComponentInjectionToken } from "../../../renderer/routes/route-specific-component-injection-token";
import applicationsRouteInjectable from "../common/applications-route.injectable";
import { Applications } from "./components/applications";

const applicationsRouteComponentInjectable = getInjectable({
  id: "applications-route-component",

  instantiate: (di) => ({
    route: di.inject(applicationsRouteInjectable),
    Component: Applications,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default applicationsRouteComponentInjectable;
