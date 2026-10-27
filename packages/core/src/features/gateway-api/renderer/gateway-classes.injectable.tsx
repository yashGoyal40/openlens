/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { GatewayClass, gatewayClassesDescriptor } from "../common/gateway-api-resources";
import { gatewayClassesRoutes } from "../common/gateway-api-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { getPrimaryCondition } from "../../resource-views/renderer/components/resource-conditions";
import { StatusBadge, toneForStatus } from "../../resource-views/renderer/components/status-badge";
import gatewayApiSidebarGroupInjectable from "./gateway-api-sidebar-group.injectable";

const AcceptedBadge = ({ gatewayClass }: { gatewayClass: GatewayClass }) => {
  const accepted = getPrimaryCondition(gatewayClass.status?.conditions, ["Accepted"]);

  return (
    <StatusBadge
      tone={toneForStatus(accepted?.status ?? "Unknown")}
      label={accepted?.status === "True" ? "Accepted" : accepted?.reason ?? "Unknown"}
      tooltip={accepted?.message}
    />
  );
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<GatewayClass>({
  descriptor: gatewayClassesDescriptor,
  objectConstructor: GatewayClass,
  routes: gatewayClassesRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 10,
  },
  columns: [
    {
      id: "controller",
      title: "Controller",
      size: "wide",
      value: gatewayClass => gatewayClass.spec.controllerName,
      sortBy: gatewayClass => gatewayClass.spec.controllerName,
      search: gatewayClass => gatewayClass.spec.controllerName,
    },
    {
      id: "accepted",
      title: "Status",
      value: gatewayClass => <AcceptedBadge gatewayClass={gatewayClass} />,
    },
  ],
  details: [
    {
      name: "Controller",
      value: gatewayClass => gatewayClass.spec.controllerName,
    },
    {
      name: "Description",
      value: gatewayClass => gatewayClass.spec.description,
      hidden: gatewayClass => !gatewayClass.spec.description,
    },
    {
      name: "Parameters",
      value: ({ spec: { parametersRef }}) => parametersRef && `${parametersRef.kind ?? ""} ${parametersRef.namespace ? `${parametersRef.namespace}/` : ""}${parametersRef.name}`,
      hidden: gatewayClass => !gatewayClass.spec.parametersRef,
    },
  ],
}));
