/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { observableHistoryInjectionToken } from "@k8slens/routing";
import { navigateToRouteInjectionToken } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import kubeDetailsUrlParamInjectable from "../../../renderer/components/kube-detail-params/kube-details-url.injectable";
import kubeSelectedUrlParamInjectable from "../../../renderer/components/kube-detail-params/kube-selected-url.injectable";
import applicationsRouteInjectable from "../common/applications-route.injectable";

/**
 * Opens the details of the given application, or closes them when given nothing
 */
export type ShowApplicationDetails = (application: { namespace: string; name: string } | undefined) => void;

const showApplicationDetailsInjectable = getInjectable({
  id: "applications-show-application-details",

  instantiate: (di): ShowApplicationDetails => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(applicationsRouteInjectable);
    const observableHistory = di.inject(observableHistoryInjectionToken);
    const kubeDetailsUrlParam = di.inject(kubeDetailsUrlParamInjectable);
    const kubeSelectedUrlParam = di.inject(kubeSelectedUrlParamInjectable);

    return (application) => {
      // Keeps the search of the list, which lives in the query
      const query = new URLSearchParams(observableHistory.searchParams);

      query.delete(kubeDetailsUrlParam.name);
      query.delete(kubeSelectedUrlParam.name);

      navigateToRoute(route, {
        parameters: application && {
          namespace: application.namespace,
          name: application.name,
        },
        query: Object.fromEntries(query),
      });
    };
  },
});

export default showApplicationDetailsInjectable;
