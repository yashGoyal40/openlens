/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { UDPRoute, udpRoutesDescriptor } from "../common/gateway-api-resources";
import { udpRoutesRoutes } from "../common/gateway-api-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { getRouteColumns, getRouteDetails, RouteParentsAndRules } from "./route-view-helpers";
import gatewayApiSidebarGroupInjectable from "./gateway-api-sidebar-group.injectable";

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<UDPRoute>({
  descriptor: udpRoutesDescriptor,
  objectConstructor: UDPRoute,
  routes: udpRoutesRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 70,
  },
  columns: getRouteColumns<UDPRoute>({ withHostnames: false }),
  details: getRouteDetails<UDPRoute>({ withHostnames: false }),
  DetailsComponent: ({ object }) => <RouteParentsAndRules route={object} />,
}));
