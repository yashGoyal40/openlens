/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createSidebarGroupInjectable } from "../../../resource-views/renderer/create-sidebar-group-injectable";
import gitOpsSidebarGroupInjectable from "../../renderer/gitops-sidebar-group.injectable";

const argoCdSidebarGroupInjectable = createSidebarGroupInjectable({
  id: "gitops-argo-cd",
  title: "Argo CD",
  parentId: gitOpsSidebarGroupInjectable.id,
  orderNumber: 10,
});

export default argoCdSidebarGroupInjectable;
