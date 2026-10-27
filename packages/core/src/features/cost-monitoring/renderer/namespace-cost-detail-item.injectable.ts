/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { kubeObjectDetailItemInjectionToken } from "../../../renderer/components/kube-object-details/kube-object-detail-items/kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../../../renderer/components/kube-object-details/kube-object-detail-items/kube-object-matches-to-kind-and-api-version";
import currentKubeObjectInDetailsInjectable from "../../../renderer/components/kube-object-details/current-kube-object-in-details.injectable";
import costMonitoringRouteInjectable from "../common/cost-monitoring-route.injectable";
import { NamespaceCostSummary } from "./components/namespace-cost-summary";

const isNamespace = kubeObjectMatchesToKindAndApiVersion("Namespace", ["v1"]);

const namespaceCostDetailItemInjectable = getInjectable({
  id: "cost-monitoring-namespace-cost-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);
    const route = di.inject(costMonitoringRouteInjectable);

    return {
      Component: NamespaceCostSummary,
      enabled: computed(() => route.isEnabled.get() && isNamespace(kubeObject.value.get()?.object)),
      // right after the namespace details
      orderNumber: 11,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default namespaceCostDetailItemInjectable;
