/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { GRPCRouteMatch } from "../common/gateway-api-resources";
import { GRPCRoute, grpcRoutesDescriptor } from "../common/gateway-api-resources";
import { grpcRoutesRoutes } from "../common/gateway-api-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { getRouteColumns, getRouteDetails, RouteParentsAndRules } from "./route-view-helpers";
import gatewayApiSidebarGroupInjectable from "./gateway-api-sidebar-group.injectable";

const formatGrpcMatch = (rawMatch: unknown) => {
  const match = rawMatch as GRPCRouteMatch;

  return [
    match.method && `${match.method.service ?? "*"}/${match.method.method ?? "*"}`,
    ...(match.headers?.map(header => `${header.name}=${header.value}`) ?? []),
  ].filter(Boolean).join(" ");
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<GRPCRoute>({
  descriptor: grpcRoutesDescriptor,
  objectConstructor: GRPCRoute,
  routes: grpcRoutesRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 40,
  },
  columns: getRouteColumns<GRPCRoute>({ withHostnames: true }),
  details: getRouteDetails<GRPCRoute>({ withHostnames: true }),
  DetailsComponent: ({ object }) => <RouteParentsAndRules route={object} renderMatch={formatGrpcMatch} />,
}));
