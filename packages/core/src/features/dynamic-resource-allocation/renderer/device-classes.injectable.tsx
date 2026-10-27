/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { DeviceClass, deviceClassesDescriptor } from "../common/dynamic-resource-allocation-resources";
import { deviceClassesRoutes } from "../common/dynamic-resource-allocation-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { Expression, OpaqueParameters } from "./device-request-views";
import dynamicResourceAllocationSidebarGroupInjectable from "./dynamic-resource-allocation-sidebar-group.injectable";

const getSelectorCount = (deviceClass: DeviceClass) => deviceClass.spec.selectors?.length ?? 0;

const getConfigDrivers = (deviceClass: DeviceClass) => [
  ...new Set(deviceClass.spec.config?.flatMap(config => config.opaque?.driver ?? []) ?? []),
];

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<DeviceClass>({
  descriptor: deviceClassesDescriptor,
  objectConstructor: DeviceClass,
  routes: deviceClassesRoutes,
  sidebar: {
    parentId: dynamicResourceAllocationSidebarGroupInjectable.id,
    orderNumber: 30,
  },
  columns: [
    {
      id: "selectors",
      title: "Selectors",
      size: "narrow",
      value: getSelectorCount,
      sortBy: getSelectorCount,
    },
    {
      id: "config-drivers",
      title: "Configured Drivers",
      size: "wide",
      value: deviceClass => getConfigDrivers(deviceClass).join(", "),
      search: getConfigDrivers,
    },
    {
      id: "extended-resource",
      title: "Extended Resource",
      value: deviceClass => deviceClass.spec.extendedResourceName,
      sortBy: deviceClass => deviceClass.spec.extendedResourceName,
      search: deviceClass => deviceClass.spec.extendedResourceName,
    },
  ],
  details: [
    {
      name: "Extended Resource",
      value: deviceClass => deviceClass.spec.extendedResourceName,
      hidden: deviceClass => !deviceClass.spec.extendedResourceName,
    },
  ],
  DetailsComponent: ({ object: deviceClass }) => (
    <>
      <ResourceTable
        title="Selectors"
        rows={deviceClass.spec.selectors}
        columns={[
          { title: "#", className: "narrow", value: (selector, index) => index + 1 },
          { title: "CEL Expression", value: selector => <Expression>{selector.cel?.expression ?? ""}</Expression> },
        ]}
      />
      <ResourceTable
        title="Configuration"
        rows={deviceClass.spec.config}
        columns={[
          { title: "Driver", value: config => config.opaque?.driver },
          { title: "Parameters", value: config => <OpaqueParameters parameters={config.opaque?.parameters} /> },
        ]}
      />
    </>
  ),
}));
