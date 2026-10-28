/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { KubeEventDetails } from "../../../events/kube-event-details";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";

const kubeEventDetailItemInjectable = getInjectable({
  id: "kube-event-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: KubeEventDetails,
      // an event has no events of its own
      enabled: computed(() => kubeObject.value.get()?.object?.kind !== "Event"),
      orderNumber: Infinity,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default kubeEventDetailItemInjectable;
