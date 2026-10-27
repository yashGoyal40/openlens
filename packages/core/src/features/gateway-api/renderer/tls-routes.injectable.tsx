/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { TLSRoute, tlsRoutesDescriptor } from "../common/gateway-api-resources";
import { tlsRoutesRoutes } from "../common/gateway-api-routes.injectable";
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
} = createResourceViewInjectables(defineResourceView<TLSRoute>({
  descriptor: tlsRoutesDescriptor,
  objectConstructor: TLSRoute,
  routes: tlsRoutesRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 50,
  },
  columns: getRouteColumns<TLSRoute>({ withHostnames: true }),
  details: getRouteDetails<TLSRoute>({ withHostnames: true }),
  DetailsComponent: ({ object }) => <RouteParentsAndRules route={object} />,
}));
