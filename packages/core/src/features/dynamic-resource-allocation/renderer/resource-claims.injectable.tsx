/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { DeviceRequestAllocationResult, ResourceClaimConsumerReference } from "../common/dynamic-resource-allocation-resources";
import { formatNodeSelector, getSelectedNodeName, ResourceClaim, resourceClaimsDescriptor } from "../common/dynamic-resource-allocation-resources";
import { resourceClaimsRoutes } from "../common/dynamic-resource-allocation-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { StatusBadge } from "../../resource-views/renderer/components/status-badge";
import { ConditionBadges } from "../../resource-views/renderer/components/resource-conditions";
import { ObjectReferenceLink } from "../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { DeviceClaimTables, formatRequestsSummary, getRequestedDeviceClassNames, NodeLink } from "./device-request-views";
import dynamicResourceAllocationSidebarGroupInjectable from "./dynamic-resource-allocation-sidebar-group.injectable";

const getConsumers = (claim: ResourceClaim) => claim.status?.reservedFor ?? [];

const getAllocationResults = (claim: ResourceClaim) => claim.status?.allocation?.devices?.results ?? [];

const getAllocatedDeviceNames = (claim: ResourceClaim) => getAllocationResults(claim).map(result => result.device);

const formatConsumer = (consumer: ResourceClaimConsumerReference) => (
  `${consumer.apiGroup ? `${consumer.resource}.${consumer.apiGroup}` : consumer.resource}/${consumer.name}`
);

type ClaimState = "Deleting" | "Pending" | "Allocated" | "Reserved";

const getClaimState = (claim: ResourceClaim): ClaimState => {
  if (claim.metadata.deletionTimestamp) {
    return "Deleting";
  }

  if (!claim.status?.allocation) {
    return "Pending";
  }

  return getConsumers(claim).length > 0
    ? "Reserved"
    : "Allocated";
};

const ClaimStateBadge = ({ claim }: { claim: ResourceClaim }) => {
  const consumers = getConsumers(claim);

  switch (getClaimState(claim)) {
    case "Deleting":
      return <StatusBadge tone="vague" label="Deleting" />;
    case "Pending":
      return (
        <StatusBadge
          tone="warning"
          label="Pending"
          tooltip="No devices have been allocated yet"
        />
      );
    case "Allocated":
      return (
        <StatusBadge
          tone="info"
          label="Allocated"
          tooltip="Devices are allocated, but not reserved for any consumer"
        />
      );
    case "Reserved":
      return (
        <StatusBadge
          tone="success"
          label="Reserved"
          tooltip={`Reserved for ${consumers.map(formatConsumer).join(", ")}`}
        />
      );
  }
};

/**
 * `reservedFor` only references objects in the namespace of the claim, most often pods
 */
const ConsumerLink = ({ consumer, claim }: { consumer: ResourceClaimConsumerReference; claim: ResourceClaim }) => (
  <ObjectReferenceLink
    parent={claim}
    reference={{
      resource: consumer.resource,
      group: consumer.apiGroup ?? "",
      name: consumer.name,
    }}
  />
);

const AllocatedNode = ({ claim }: { claim: ResourceClaim }) => {
  const nodeSelector = claim.status?.allocation?.nodeSelector;
  const nodeName = getSelectedNodeName(nodeSelector);

  if (nodeName) {
    return <NodeLink name={nodeName} parent={claim} />;
  }

  return (
    <>
      {formatNodeSelector(nodeSelector).map((term, index) => (
        <div key={index}>{term}</div>
      ))}
    </>
  );
};

const ResourceClaimDetails = ({ object: claim }: { object: ResourceClaim }) => {
  const results = getAllocationResults(claim);
  const hasAdminAccess = results.some(result => result.adminAccess);

  return (
    <>
      <DeviceClaimTables devices={claim.spec.devices} parent={claim} />
      <ResourceTable
        title="Allocated Devices"
        rows={results}
        columns={[
          { title: "Request", value: result => result.request },
          { title: "Driver", value: result => result.driver },
          { title: "Pool", value: result => result.pool },
          { title: "Device", value: result => result.device },
          ...(hasAdminAccess
            ? [{ title: "Admin Access", value: (result: DeviceRequestAllocationResult) => result.adminAccess ? "Yes" : "No" }]
            : []),
        ]}
      />
      <ResourceTable
        title="Reserved For"
        rows={claim.status?.reservedFor}
        columns={[
          { title: "Consumer", value: consumer => <ConsumerLink consumer={consumer} claim={claim} /> },
          { title: "Resource", value: consumer => consumer.apiGroup ? `${consumer.resource}.${consumer.apiGroup}` : consumer.resource },
          { title: "UID", value: consumer => consumer.uid },
        ]}
      />
      <ResourceTable
        title="Device Status"
        rows={claim.status?.devices}
        columns={[
          { title: "Device", value: device => `${device.driver}/${device.pool}/${device.device}` },
          { title: "Conditions", value: device => <ConditionBadges conditions={device.conditions} /> },
          {
            title: "Network",
            value: ({ networkData }) => networkData && [
              networkData.interfaceName,
              ...(networkData.ips ?? []),
              networkData.hardwareAddress,
            ].filter(Boolean).join(" "),
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
} = createResourceViewInjectables(defineResourceView<ResourceClaim>({
  descriptor: resourceClaimsDescriptor,
  objectConstructor: ResourceClaim,
  routes: resourceClaimsRoutes,
  sidebar: {
    parentId: dynamicResourceAllocationSidebarGroupInjectable.id,
    orderNumber: 10,
  },
  columns: [
    {
      id: "state",
      title: "State",
      value: claim => <ClaimStateBadge claim={claim} />,
      sortBy: getClaimState,
      search: getClaimState,
    },
    {
      id: "consumers",
      title: "Consumers",
      size: "narrow",
      value: claim => getConsumers(claim).length,
      sortBy: claim => getConsumers(claim).length,
      search: claim => getConsumers(claim).map(consumer => consumer.name),
    },
    {
      id: "requests",
      title: "Requests",
      size: "wide",
      value: claim => formatRequestsSummary(claim.spec.devices?.requests),
      search: claim => getRequestedDeviceClassNames(claim.spec.devices?.requests),
    },
    {
      id: "allocated-devices",
      title: "Allocated Devices",
      size: "wide",
      value: claim => getAllocatedDeviceNames(claim).join(", "),
      search: getAllocatedDeviceNames,
    },
  ],
  details: [
    {
      name: "State",
      value: claim => <ClaimStateBadge claim={claim} />,
    },
    {
      name: "Node",
      value: claim => <AllocatedNode claim={claim} />,
      hidden: claim => !claim.status?.allocation?.nodeSelector,
    },
  ],
  DetailsComponent: ResourceClaimDetails,
}));
