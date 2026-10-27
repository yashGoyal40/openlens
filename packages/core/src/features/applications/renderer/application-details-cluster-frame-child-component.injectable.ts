/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { computed } from "mobx";
import { getInjectable } from "@ogre-tools/injectable";
import { clusterFrameChildComponentInjectionToken } from "@k8slens/react-application";
import kubeDetailsUrlParamInjectable from "../../../renderer/components/kube-detail-params/kube-details-url.injectable";
import selectedApplicationInjectable from "./selected-application.injectable";
import { ApplicationDetailsDrawer } from "./components/application-details";

const applicationDetailsClusterFrameChildComponentInjectable = getInjectable({
  id: "application-details-cluster-frame-child-component",

  instantiate: (di) => {
    const selectedApplication = di.inject(selectedApplicationInjectable);
    const kubeDetailsUrlParam = di.inject(kubeDetailsUrlParamInjectable);

    return {
      id: "application-details",
      Component: ApplicationDetailsDrawer,
      // Following a link to one of the application's objects swaps this drawer for the object's
      // details, closing those brings the application back
      shouldRender: computed(() => Boolean(selectedApplication.get()) && !kubeDetailsUrlParam.get()),
    };
  },

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default applicationDetailsClusterFrameChildComponentInjectable;
