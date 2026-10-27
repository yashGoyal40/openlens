/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import configSidebarItemInjectable from "../../../renderer/components/config/config-sidebar-item.injectable";
import { createSidebarGroupInjectable } from "../../resource-views/renderer/create-sidebar-group-injectable";

const dynamicResourceAllocationSidebarGroupInjectable = createSidebarGroupInjectable({
  id: "dynamic-resource-allocation",
  title: "Dynamic Resources",
  parentId: configSidebarItemInjectable.id,
  orderNumber: 85,
});

export default dynamicResourceAllocationSidebarGroupInjectable;
