/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { frontEndRouteInjectionToken } from "../../../common/front-end-routing/front-end-route-injection-token";
import { navigateToRouteInjectionToken } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import { shouldShowResourceInjectionToken } from "../../cluster/showing-kube-resources/common/allowed-resources-injection-token";
import type { ResourceDescriptor } from "./resource-descriptor";

/**
 * Creates the cluster frame route of a resource view, enabled only when the resource is served
 * by the cluster and the user is allowed to list it.
 */
export const createResourceRouteInjectables = (descriptor: ResourceDescriptor) => {
  const routeInjectable = getInjectable({
    id: `${descriptor.id}-route`,

    instantiate: (di) => ({
      path: descriptor.path,
      clusterFrame: true,
      isEnabled: di.inject(shouldShowResourceInjectionToken, {
        apiName: descriptor.apiName,
        group: descriptor.group,
      }),
    }),

    injectionToken: frontEndRouteInjectionToken,
  });

  const navigateInjectable = getInjectable({
    id: `navigate-to-${descriptor.id}`,

    instantiate: (di) => {
      const navigateToRoute = di.inject(navigateToRouteInjectionToken);
      const route = di.inject(routeInjectable);

      return () => navigateToRoute(route);
    },
  });

  return { routeInjectable, navigateInjectable };
};

export type ResourceRouteInjectables = ReturnType<typeof createResourceRouteInjectables>;
