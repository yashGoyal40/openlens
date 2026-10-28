/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createSidebarGroupInjectable } from "../../resource-views/renderer/create-sidebar-group-injectable";

const dynamicResourceAllocationSidebarGroupInjectable = createSidebarGroupInjectable({
  id: "dynamic-resource-allocation",
  title: "Device Resources",
  parentId: null,
  orderNumber: 65,
  material: "memory",
  isNew: true,
});

export default dynamicResourceAllocationSidebarGroupInjectable;
