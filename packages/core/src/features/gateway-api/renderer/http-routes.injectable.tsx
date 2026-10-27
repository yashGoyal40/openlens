/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { HTTPRouteMatch } from "../common/gateway-api-resources";
import { HTTPRoute, httpRoutesDescriptor } from "../common/gateway-api-resources";
import { httpRoutesRoutes } from "../common/gateway-api-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { getRouteColumns, getRouteDetails, RouteParentsAndRules } from "./route-view-helpers";
import gatewayApiSidebarGroupInjectable from "./gateway-api-sidebar-group.injectable";

const formatHttpMatch = (rawMatch: unknown) => {
  const match = rawMatch as HTTPRouteMatch;

  return [
    match.method,
    match.path && `${match.path.value ?? "/"}${match.path.type === "Exact" ? "" : "*"}`,
    ...(match.headers?.map(header => `${header.name}=${header.value}`) ?? []),
    ...(match.queryParams?.map(param => `?${param.name}=${param.value}`) ?? []),
  ].filter(Boolean).join(" ");
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<HTTPRoute>({
  descriptor: httpRoutesDescriptor,
  objectConstructor: HTTPRoute,
  routes: httpRoutesRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 30,
  },
  columns: getRouteColumns<HTTPRoute>({ withHostnames: true }),
  details: getRouteDetails<HTTPRoute>({ withHostnames: true }),
  DetailsComponent: ({ object }) => <RouteParentsAndRules route={object} renderMatch={formatHttpMatch} />,
}));
