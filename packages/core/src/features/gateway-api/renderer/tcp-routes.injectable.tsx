/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { TCPRoute, tcpRoutesDescriptor } from "../common/gateway-api-resources";
import { tcpRoutesRoutes } from "../common/gateway-api-routes.injectable";
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
} = createResourceViewInjectables(defineResourceView<TCPRoute>({
  descriptor: tcpRoutesDescriptor,
  objectConstructor: TCPRoute,
  routes: tcpRoutesRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 60,
  },
  columns: getRouteColumns<TCPRoute>({ withHostnames: false }),
  details: getRouteDetails<TCPRoute>({ withHostnames: false }),
  DetailsComponent: ({ object }) => <RouteParentsAndRules route={object} />,
}));
