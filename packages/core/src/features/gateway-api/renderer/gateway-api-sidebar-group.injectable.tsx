/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import networkSidebarItemInjectable from "../../../renderer/components/network/network-sidebar-item.injectable";
import { createSidebarGroupInjectable } from "../../resource-views/renderer/create-sidebar-group-injectable";

const gatewayApiSidebarGroupInjectable = createSidebarGroupInjectable({
  id: "gateway-api",
  title: "Gateway API",
  parentId: networkSidebarItemInjectable.id,
  orderNumber: 35,
});

export default gatewayApiSidebarGroupInjectable;
