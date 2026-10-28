/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { DrawerTitle } from "../drawer";
import { kubeObjectDetailItemInjectionToken } from "./kube-object-detail-items/kube-object-detail-item-injection-token";

const PropertiesTitle = () => <DrawerTitle>Properties</DrawerTitle>;

/**
 * Heads the details, between the metrics and the metadata
 */
const propertiesTitleDetailItemInjectable = getInjectable({
  id: "properties-title-detail-item",
  instantiate: () => ({
    Component: PropertiesTitle,
    enabled: computed(() => true),
    orderNumber: -0.5,
  }),
  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default propertiesTitleDetailItemInjectable;
