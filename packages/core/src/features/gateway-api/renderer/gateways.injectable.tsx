/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { Gateway, gatewaysDescriptor } from "../common/gateway-api-resources";
import { gatewaysRoutes } from "../common/gateway-api-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ConditionBadges, getPrimaryCondition } from "../../resource-views/renderer/components/resource-conditions";
import { StatusBadge } from "../../resource-views/renderer/components/status-badge";
import { ObjectReferenceLink } from "../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import gatewayApiSidebarGroupInjectable from "./gateway-api-sidebar-group.injectable";

const getAddresses = (gateway: Gateway) => (
  (gateway.status?.addresses ?? gateway.spec.addresses ?? []).map(address => address.value)
);

const getAttachedRoutes = (gateway: Gateway) => (
  gateway.status?.listeners?.reduce((count, listener) => count + listener.attachedRoutes, 0) ?? 0
);

const ProgrammedBadge = ({ gateway }: { gateway: Gateway }) => {
  const programmed = getPrimaryCondition(gateway.status?.conditions, ["Programmed"]);
  const accepted = getPrimaryCondition(gateway.status?.conditions, ["Accepted"]);

  if (programmed?.status === "True") {
    return <StatusBadge tone="success" label="Programmed" />;
  }

  const failing = programmed ?? accepted;

  return (
    <StatusBadge
      tone={failing?.status === "False" ? "error" : "warning"}
      label={failing?.reason ?? "Pending"}
      tooltip={failing?.message}
    />
  );
};

const GatewayListeners = ({ object: gateway }: { object: Gateway }) => (
  <ResourceTable
    title="Listeners"
    rows={gateway.spec.listeners}
    columns={[
      { title: "Name", value: listener => listener.name },
      { title: "Protocol", value: listener => listener.protocol },
      { title: "Port", value: listener => listener.port },
      { title: "Hostname", value: listener => listener.hostname ?? "*" },
      {
        title: "TLS",
        value: listener => listener.tls && [
          listener.tls.mode ?? "Terminate",
          ...(listener.tls.certificateRefs?.map(ref => ref.name) ?? []),
        ].join(" "),
      },
      {
        title: "Attached Routes",
        value: listener => gateway.status?.listeners?.find(status => status.name === listener.name)?.attachedRoutes ?? 0,
      },
      {
        title: "Status",
        value: listener => (
          <ConditionBadges conditions={gateway.status?.listeners?.find(status => status.name === listener.name)?.conditions} />
        ),
      },
    ]}
  />
);

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<Gateway>({
  descriptor: gatewaysDescriptor,
  objectConstructor: Gateway,
  routes: gatewaysRoutes,
  sidebar: {
    parentId: gatewayApiSidebarGroupInjectable.id,
    orderNumber: 20,
  },
  columns: [
    {
      id: "class",
      title: "Class",
      value: gateway => gateway.spec.gatewayClassName,
      sortBy: gateway => gateway.spec.gatewayClassName,
      search: gateway => gateway.spec.gatewayClassName,
    },
    {
      id: "addresses",
      title: "Addresses",
      size: "wide",
      value: gateway => getAddresses(gateway).join(", "),
      search: getAddresses,
    },
    {
      id: "listeners",
      title: "Listeners",
      size: "narrow",
      value: gateway => gateway.spec.listeners.length,
      sortBy: gateway => gateway.spec.listeners.length,
    },
    {
      id: "attached-routes",
      title: "Routes",
      size: "narrow",
      value: getAttachedRoutes,
      sortBy: getAttachedRoutes,
    },
    {
      id: "status",
      title: "Status",
      value: gateway => <ProgrammedBadge gateway={gateway} />,
    },
  ],
  details: [
    {
      name: "Class",
      value: gateway => (
        <ObjectReferenceLink
          parent={gateway}
          reference={{ kind: "GatewayClass", group: "gateway.networking.k8s.io", name: gateway.spec.gatewayClassName }}
        />
      ),
    },
    {
      name: "Addresses",
      value: gateway => getAddresses(gateway).join(", "),
      hidden: gateway => getAddresses(gateway).length === 0,
    },
    {
      name: "Status",
      value: gateway => <ProgrammedBadge gateway={gateway} />,
    },
  ],
  DetailsComponent: GatewayListeners,
}));
