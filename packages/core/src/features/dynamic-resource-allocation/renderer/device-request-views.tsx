/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./dynamic-resource-allocation.module.scss";

import React from "react";
import type { KubeObject } from "@k8slens/kube-object";
import type { DeviceClaim, DeviceRequest, DeviceRequestAlternative, DeviceSelector } from "../common/dynamic-resource-allocation-resources";
import { dynamicResourceAllocationGroup, formatRequestedCount, getRequestAlternatives } from "../common/dynamic-resource-allocation-resources";
import { ObjectReferenceLink } from "../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";

export const Expression = ({ children }: { children: string }) => (
  <code className={styles.expression}>{children}</code>
);

export const SelectorExpressions = ({ selectors }: { selectors: DeviceSelector[] | undefined }) => (
  <>
    {selectors?.map((selector, index) => (
      <Expression key={index}>{selector.cel?.expression ?? ""}</Expression>
    ))}
  </>
);

export const OpaqueParameters = ({ parameters }: { parameters: unknown }) => (
  parameters === undefined
    ? null
    : <Expression>{JSON.stringify(parameters, null, 2)}</Expression>
);

export const DeviceClassLink = ({ name, parent }: { name: string; parent: KubeObject }) => (
  <ObjectReferenceLink
    parent={parent}
    reference={{ kind: "DeviceClass", group: dynamicResourceAllocationGroup, name }}
  />
);

export const NodeLink = ({ name, parent }: { name: string; parent: KubeObject }) => (
  <ObjectReferenceLink
    parent={parent}
    reference={{ kind: "Node", group: "", name }}
  />
);

const formatAlternative =(alternative: DeviceRequestAlternative) => (
  alternative.allocationMode === "All"
    ? `all ${alternative.deviceClassName}`
    : `${alternative.count ?? 1} × ${alternative.deviceClassName}`
);

/**
 * E.g. "2 × gpu.example.com, 1 × large-nic | 2 × small-nic"
 */
export const formatRequestsSummary = (requests: DeviceRequest[] | undefined) => (
  requests
    ?.map(request => getRequestAlternatives(request).map(formatAlternative).join(" | "))
    .join(", ")
);

export const getRequestedDeviceClassNames = (requests: DeviceRequest[] | undefined) => (
  requests?.flatMap(request => getRequestAlternatives(request).map(alternative => alternative.deviceClassName)) ?? []
);

const formatRequestNames = (requests: string[] | undefined) => (
  requests?.length ? requests.join(", ") : "All"
);

export interface DeviceClaimTablesProps {
  devices: DeviceClaim | undefined;
  parent: KubeObject;
}

/**
 * The requests, constraints and configuration of a claim or of a claim template
 */
export const DeviceClaimTables = ({ devices, parent }: DeviceClaimTablesProps) => {
  const alternatives = devices?.requests?.flatMap(getRequestAlternatives);
  const hasAdminAccess = alternatives?.some(alternative => alternative.adminAccess);

  return (
    <>
      <ResourceTable
        title="Requests"
        rows={alternatives}
        columns={[
          { title: "Name", value: alternative => alternative.fullName },
          { title: "Device Class", value: alternative => <DeviceClassLink name={alternative.deviceClassName} parent={parent} /> },
          { title: "Count", className: "narrow", value: formatRequestedCount },
          { title: "Selectors", value: alternative => <SelectorExpressions selectors={alternative.selectors} /> },
          ...(hasAdminAccess
            ? [{ title: "Admin Access", value: (alternative: DeviceRequestAlternative) => alternative.adminAccess ? "Yes" : "No" }]
            : []),
        ]}
      />
      <ResourceTable
        title="Constraints"
        rows={devices?.constraints}
        columns={[
          { title: "Requests", value: constraint => formatRequestNames(constraint.requests) },
          {
            title: "Constraint",
            value: constraint => (
              constraint.matchAttribute
                ? `same ${constraint.matchAttribute}`
                : constraint.distinctAttribute && `distinct ${constraint.distinctAttribute}`
            ),
          },
        ]}
      />
      <ResourceTable
        title="Configuration"
        rows={devices?.config}
        columns={[
          { title: "Requests", value: config => formatRequestNames(config.requests) },
          { title: "Driver", value: config => config.opaque?.driver },
          { title: "Parameters", value: config => <OpaqueParameters parameters={config.opaque?.parameters} /> },
        ]}
      />
    </>
  );
};
