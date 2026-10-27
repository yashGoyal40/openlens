/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { ResourceClaimTemplate, resourceClaimTemplatesDescriptor } from "../common/dynamic-resource-allocation-resources";
import { resourceClaimTemplatesRoutes } from "../common/dynamic-resource-allocation-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { DeviceClaimTables, formatRequestsSummary, getRequestedDeviceClassNames } from "./device-request-views";
import dynamicResourceAllocationSidebarGroupInjectable from "./dynamic-resource-allocation-sidebar-group.injectable";

const getDevices = (template: ResourceClaimTemplate) => template.spec.spec?.devices;

const formatLabels = (labels: Partial<Record<string, string>> | undefined) => (
  Object.entries(labels ?? {}).map(([key, value]) => `${key}=${value ?? ""}`)
);

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ResourceClaimTemplate>({
  descriptor: resourceClaimTemplatesDescriptor,
  objectConstructor: ResourceClaimTemplate,
  routes: resourceClaimTemplatesRoutes,
  sidebar: {
    parentId: dynamicResourceAllocationSidebarGroupInjectable.id,
    orderNumber: 20,
  },
  columns: [
    {
      id: "requests",
      title: "Requests",
      size: "wide",
      value: template => formatRequestsSummary(getDevices(template)?.requests),
      search: template => getRequestedDeviceClassNames(getDevices(template)?.requests),
    },
    {
      id: "constraints",
      title: "Constraints",
      size: "narrow",
      value: template => getDevices(template)?.constraints?.length ?? 0,
      sortBy: template => getDevices(template)?.constraints?.length ?? 0,
    },
  ],
  details: [
    {
      name: "Claim Labels",
      value: template => formatLabels(template.spec.metadata?.labels).join(", "),
      hidden: template => formatLabels(template.spec.metadata?.labels).length === 0,
    },
  ],
  DetailsComponent: ({ object: template }) => (
    <DeviceClaimTables devices={getDevices(template)} parent={template} />
  ),
}));
