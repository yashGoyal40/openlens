/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { frontEndRouteInjectionToken } from "../../../common/front-end-routing/front-end-route-injection-token";
import { shouldShowResourceInjectionToken } from "../../cluster/showing-kube-resources/common/allowed-resources-injection-token";

/**
 * OpenCost is reached through the service proxy of the Kubernetes API, so the page is only
 * useful when services can be accessed
 */
const costMonitoringRouteInjectable = getInjectable({
  id: "cost-monitoring-route",

  instantiate: (di) => ({
    path: "/cost",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "services",
      group: "",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default costMonitoringRouteInjectable;
