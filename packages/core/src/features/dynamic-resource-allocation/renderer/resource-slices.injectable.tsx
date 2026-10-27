/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { Device, DeviceProperties, DeviceTaint } from "../common/dynamic-resource-allocation-resources";
import {
  formatDeviceAttribute,
  formatDeviceCapacity,
  formatNodeSelector,
  getDeviceProperties,
  ResourceSlice,
  resourceSlicesDescriptor,
} from "../common/dynamic-resource-allocation-resources";
import { resourceSlicesRoutes } from "../common/dynamic-resource-allocation-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { NodeLink } from "./device-request-views";
import dynamicResourceAllocationSidebarGroupInjectable from "./dynamic-resource-allocation-sidebar-group.injectable";

const getDeviceCount = (slice: ResourceSlice) => slice.spec.devices?.length ?? 0;

/**
 * Exactly one of these is set for a slice
 */
const getNodeScope = ({ spec }: ResourceSlice) => {
  if (spec.nodeName) {
    return spec.nodeName;
  }

  if (spec.allNodes) {
    return "All nodes";
  }

  if (spec.perDeviceNodeSelection) {
    return "Per device";
  }

  return formatNodeSelector(spec.nodeSelector).join(" or ");
};

const getDeviceNodeScope = (properties: DeviceProperties) => (
  properties.nodeName
  ?? (properties.allNodes ? "All nodes" : formatNodeSelector(properties.nodeSelector).join(" or "))
);

const SliceNode = ({ slice }: { slice: ResourceSlice }) => (
  slice.spec.nodeName
    ? <NodeLink name={slice.spec.nodeName} parent={slice} />
    : <>{getNodeScope(slice)}</>
);

const formatTaint = ({ key, value, effect }: DeviceTaint) => `${key}${value ? `=${value}` : ""}:${effect}`;

const KeyValueLines = ({ entries }: { entries: [string, string][] }) => (
  <>
    {entries.map(([key, value]) => (
      <div key={key}>{`${key}: ${value}`}</div>
    ))}
  </>
);

const ResourceSliceDevices = ({ object: slice }: { object: ResourceSlice }) => {
  const devices = slice.spec.devices;
  const hasTaints = devices?.some(device => getDeviceProperties(device).taints?.length);

  return (
    <>
      <ResourceTable
        title="Devices"
        rows={devices}
        columns={[
          { title: "Name", value: device => device.name },
          {
            title: "Attributes",
            className: "wide",
            value: device => (
              <KeyValueLines
                entries={Object.entries(getDeviceProperties(device).attributes ?? {})
                  .map(([key, attribute]) => [key, formatDeviceAttribute(attribute)])}
              />
            ),
          },
          {
            title: "Capacity",
            value: device => (
              <KeyValueLines
                entries={Object.entries(getDeviceProperties(device).capacity ?? {})
                  .map(([key, capacity]) => [key, formatDeviceCapacity(capacity)])}
              />
            ),
          },
          ...(slice.spec.perDeviceNodeSelection
            ? [{ title: "Node", value: (device: Device) => getDeviceNodeScope(getDeviceProperties(device)) }]
            : []),
          ...(hasTaints
            ? [{ title: "Taints", value: (device: Device) => getDeviceProperties(device).taints?.map(formatTaint).join(", ") }]
            : []),
        ]}
      />
      <ResourceTable
        title="Shared Counters"
        rows={slice.spec.sharedCounters}
        columns={[
          { title: "Counter Set", value: counterSet => counterSet.name },
          {
            title: "Counters",
            value: counterSet => (
              <KeyValueLines
                entries={Object.entries(counterSet.counters ?? {})
                  .map(([key, counter]) => [key, counter?.value ?? ""])}
              />
            ),
          },
        ]}
      />
    </>
  );
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ResourceSlice>({
  descriptor: resourceSlicesDescriptor,
  objectConstructor: ResourceSlice,
  routes: resourceSlicesRoutes,
  sidebar: {
    parentId: dynamicResourceAllocationSidebarGroupInjectable.id,
    orderNumber: 40,
  },
  columns: [
    {
      id: "driver",
      title: "Driver",
      size: "wide",
      value: slice => slice.spec.driver,
      sortBy: slice => slice.spec.driver,
      search: slice => slice.spec.driver,
    },
    {
      id: "node",
      title: "Node",
      value: slice => <SliceNode slice={slice} />,
      sortBy: getNodeScope,
      search: getNodeScope,
    },
    {
      id: "pool",
      title: "Pool",
      value: slice => slice.spec.pool.name,
      sortBy: slice => slice.spec.pool.name,
      search: slice => slice.spec.pool.name,
    },
    {
      id: "devices",
      title: "Devices",
      size: "narrow",
      value: getDeviceCount,
      sortBy: getDeviceCount,
    },
  ],
  details: [
    {
      name: "Driver",
      value: slice => slice.spec.driver,
    },
    {
      name: "Pool",
      value: ({ spec: { pool }}) => `${pool.name} (generation ${pool.generation}, ${pool.resourceSliceCount} slice${pool.resourceSliceCount === 1 ? "" : "s"})`,
    },
    {
      name: "Node",
      value: slice => <SliceNode slice={slice} />,
    },
  ],
  DetailsComponent: ResourceSliceDevices,
}));
