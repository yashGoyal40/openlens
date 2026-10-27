/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computedOr } from "@k8slens/utilities";
import type { Route } from "../../../common/front-end-routing/front-end-route-injection-token";
import { frontEndRouteInjectionToken } from "../../../common/front-end-routing/front-end-route-injection-token";
import { shouldShowResourceInjectionToken } from "../../cluster/showing-kube-resources/common/allowed-resources-injection-token";

export interface ApplicationsPathParameters {
  namespace?: string;
  name?: string;
}

/**
 * The applications list, optionally with the details of one application open
 */
const applicationsRouteInjectable = getInjectable({
  id: "applications-route",

  instantiate: (di): Route<ApplicationsPathParameters> => ({
    path: "/applications/:namespace?/:name?",
    clusterFrame: true,
    // Applications are mostly made of long running workloads, so only offer the view when those can be listed
    isEnabled: computedOr(
      di.inject(shouldShowResourceInjectionToken, { apiName: "deployments", group: "apps" }),
      di.inject(shouldShowResourceInjectionToken, { apiName: "statefulsets", group: "apps" }),
      di.inject(shouldShowResourceInjectionToken, { apiName: "daemonsets", group: "apps" }),
    ),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default applicationsRouteInjectable;
