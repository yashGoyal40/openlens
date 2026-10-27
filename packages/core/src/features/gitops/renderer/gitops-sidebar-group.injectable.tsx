/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createSidebarGroupInjectable } from "../../resource-views/renderer/create-sidebar-group-injectable";

const gitOpsSidebarGroupInjectable = createSidebarGroupInjectable({
  id: "gitops",
  title: "GitOps",
  parentId: null,
  orderNumber: 92,
  material: "sync",
});

export default gitOpsSidebarGroupInjectable;
