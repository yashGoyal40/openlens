/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createSidebarGroupInjectable } from "../../resource-views/renderer/create-sidebar-group-injectable";

const securityCenterSidebarGroupInjectable = createSidebarGroupInjectable({
  id: "security-center",
  title: "Security",
  parentId: null,
  orderNumber: 95,
  material: "security",
});

export default securityCenterSidebarGroupInjectable;
