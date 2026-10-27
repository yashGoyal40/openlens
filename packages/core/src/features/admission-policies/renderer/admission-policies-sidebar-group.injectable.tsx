/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import configSidebarItemInjectable from "../../../renderer/components/config/config-sidebar-item.injectable";
import { createSidebarGroupInjectable } from "../../resource-views/renderer/create-sidebar-group-injectable";

const admissionPoliciesSidebarGroupInjectable = createSidebarGroupInjectable({
  id: "admission-policies",
  title: "Admission Policies",
  parentId: configSidebarItemInjectable.id,
  // After the webhook configurations
  orderNumber: 105,
});

export default admissionPoliciesSidebarGroupInjectable;
