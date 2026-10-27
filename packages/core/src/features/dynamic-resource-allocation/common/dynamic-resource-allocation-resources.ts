/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ClusterScopedMetadata, NamespaceScopedMetadata } from "@k8slens/kube-object";
import { KubeObject } from "@k8slens/kube-object";
import { describeResource } from "../../resource-views/common/resource-descriptor";
import type { KubeCondition } from "../../resource-views/common/kube-condition";

export const dynamicResourceAllocationGroup = "resource.k8s.io";

// v1 is GA since Kubernetes 1.34, the beta versions are served by older clusters
const versions: [string, ...string[]] = ["v1", "v1beta2", "v1beta1"];

export const resourceClaimsDescriptor = describeResource({
  id: "dynamic-resource-allocation-resource-claims",
  kind: "ResourceClaim",
  group: dynamicResourceAllocationGroup,
  versions,
  apiName: "resourceclaims",
  namespaced: true,
  title: "Resource Claims",
});

export const resourceClaimTemplatesDescriptor = describeResource({
  id: "dynamic-resource-allocation-resource-claim-templates",
  kind: "ResourceClaimTemplate",
  group: dynamicResourceAllocationGroup,
  versions,
  apiName: "resourceclaimtemplates",
  namespaced: true,
  title: "Resource Claim Templates",
});

export const deviceClassesDescriptor = describeResource({
  id: "dynamic-resource-allocation-device-classes",
  kind: "DeviceClass",
  group: dynamicResourceAllocationGroup,
  versions,
  apiName: "deviceclasses",
  namespaced: false,
  title: "Device Classes",
});

export const resourceSlicesDescriptor = describeResource({
  id: "dynamic-resource-allocation-resource-slices",
  kind: "ResourceSlice",
  group: dynamicResourceAllocationGroup,
  versions,
  apiName: "resourceslices",
  namespaced: false,
  title: "Resource Slices",
});

export interface NodeSelectorRequirement {
  key: string;
  operator: "In" | "NotIn" | "Exists" | "DoesNotExist" | "Gt" | "Lt" | string;
  values?: string[];
}

export interface NodeSelectorTerm {
  matchExpressions?: NodeSelectorRequirement[];
  matchFields?: NodeSelectorRequirement[];
}

export interface NodeSelector {
  nodeSelectorTerms?: NodeSelectorTerm[];
}

export interface DeviceSelector {
  cel?: {
    expression: string;
  };
}

export interface DeviceToleration {
  key?: string;
  operator?: "Exists" | "Equal" | string;
  value?: string;
  effect?: string;
  tolerationSeconds?: number;
}

export interface OpaqueDeviceConfiguration {
  driver: string;
  parameters?: unknown;
}

export interface ExactDeviceRequest {
  deviceClassName: string;
  selectors?: DeviceSelector[];
  allocationMode?: "ExactCount" | "All" | string;
  count?: number;
  adminAccess?: boolean;
  tolerations?: DeviceToleration[];
  capacity?: {
    requests?: Partial<Record<string, string>>;
  };
}

export interface DeviceSubRequest extends Omit<ExactDeviceRequest, "adminAccess"> {
  name: string;
}

/**
 * In v1 and v1beta2 the request is either `exactly` or `firstAvailable`, in v1beta1 the fields
 * of `exactly` are inlined
 */
export interface DeviceRequest extends Partial<ExactDeviceRequest> {
  name: string;
  exactly?: ExactDeviceRequest;
  firstAvailable?: DeviceSubRequest[];
}

export interface DeviceConstraint {
  requests?: string[];
  matchAttribute?: string;
  distinctAttribute?: string;
}

export interface DeviceClaimConfiguration {
  requests?: string[];
  opaque?: OpaqueDeviceConfiguration;
}

export interface DeviceClaim {
  requests?: DeviceRequest[];
  constraints?: DeviceConstraint[];
  config?: DeviceClaimConfiguration[];
}

export interface ResourceClaimSpec {
  devices?: DeviceClaim;
}

export interface DeviceRequestAllocationResult {
  /**
   * Either the request name or "<request>/<sub-request>" for `firstAvailable` requests
   */
  request: string;
  driver: string;
  pool: string;
  device: string;
  adminAccess?: boolean;
  shareID?: string;
  tolerations?: DeviceToleration[];
}

export interface DeviceAllocationConfiguration extends DeviceClaimConfiguration {
  source: "FromClass" | "FromClaim" | string;
}

export interface AllocationResult {
  devices?: {
    results?: DeviceRequestAllocationResult[];
    config?: DeviceAllocationConfiguration[];
  };
  nodeSelector?: NodeSelector;
  allocationTimestamp?: string;
}

export interface ResourceClaimConsumerReference {
  apiGroup?: string;
  resource: string;
  name: string;
  uid: string;
}

export interface AllocatedDeviceStatus {
  driver: string;
  pool: string;
  device: string;
  shareID?: string;
  conditions?: KubeCondition[];
  data?: unknown;
  networkData?: {
    interfaceName?: string;
    ips?: string[];
    hardwareAddress?: string;
  };
}

export interface ResourceClaimStatus {
  allocation?: AllocationResult;
  reservedFor?: ResourceClaimConsumerReference[];
  devices?: AllocatedDeviceStatus[];
}

export class ResourceClaim extends KubeObject<NamespaceScopedMetadata, ResourceClaimStatus, ResourceClaimSpec> {
  static readonly kind = resourceClaimsDescriptor.kind;
  static readonly namespaced = resourceClaimsDescriptor.namespaced;
  static readonly apiBase = resourceClaimsDescriptor.apiBase;
}

export interface ResourceClaimTemplateSpec {
  metadata?: {
    labels?: Partial<Record<string, string>>;
    annotations?: Partial<Record<string, string>>;
  };
  spec: ResourceClaimSpec;
}

export class ResourceClaimTemplate extends KubeObject<NamespaceScopedMetadata, void, ResourceClaimTemplateSpec> {
  static readonly kind = resourceClaimTemplatesDescriptor.kind;
  static readonly namespaced = resourceClaimTemplatesDescriptor.namespaced;
  static readonly apiBase = resourceClaimTemplatesDescriptor.apiBase;
}

export interface DeviceClassSpec {
  selectors?: DeviceSelector[];
  config?: { opaque?: OpaqueDeviceConfiguration }[];

  /**
   * Only set when the DRAExtendedResource feature is enabled
   */
  extendedResourceName?: string;
}

export class DeviceClass extends KubeObject<ClusterScopedMetadata, void, DeviceClassSpec> {
  static readonly kind = deviceClassesDescriptor.kind;
  static readonly namespaced = deviceClassesDescriptor.namespaced;
  static readonly apiBase = deviceClassesDescriptor.apiBase;
}

export interface DeviceAttribute {
  int?: number;
  bool?: boolean;
  string?: string;
  version?: string;
}

/**
 * A plain quantity in v1alpha3, an object since v1beta1
 */
export type DeviceCapacity = string | {
  value: string;
};

export interface DeviceTaint {
  key: string;
  value?: string;
  effect: string;
  timeAdded?: string;
}

export interface DeviceProperties {
  attributes?: Partial<Record<string, DeviceAttribute>>;
  capacity?: Partial<Record<string, DeviceCapacity>>;
  taints?: DeviceTaint[];
  nodeName?: string;
  nodeSelector?: NodeSelector;
  allNodes?: boolean;
}

/**
 * In v1beta1 the properties of a device are nested in `basic`
 */
export interface Device extends DeviceProperties {
  name: string;
  basic?: DeviceProperties;
}

export interface CounterSet {
  name: string;
  counters?: Partial<Record<string, { value: string }>>;
}

export interface ResourceSliceSpec {
  driver: string;
  pool: {
    name: string;
    generation: number;
    resourceSliceCount: number;
  };
  nodeName?: string;
  nodeSelector?: NodeSelector;
  allNodes?: boolean;
  perDeviceNodeSelection?: boolean;
  devices?: Device[];
  sharedCounters?: CounterSet[];
}

export class ResourceSlice extends KubeObject<ClusterScopedMetadata, void, ResourceSliceSpec> {
  static readonly kind = resourceSlicesDescriptor.kind;
  static readonly namespaced = resourceSlicesDescriptor.namespaced;
  static readonly apiBase = resourceSlicesDescriptor.apiBase;
}

export interface DeviceRequestAlternative extends DeviceSubRequest {
  /**
   * The name used in allocation results, "<request>/<sub-request>" for `firstAvailable` requests
   */
  fullName: string;
  adminAccess?: boolean;
}

/**
 * The ways a request can be satisfied, independent of the API version
 */
export const getRequestAlternatives = (request: DeviceRequest): DeviceRequestAlternative[] => {
  if (request.firstAvailable?.length) {
    return request.firstAvailable.map(subRequest => ({
      ...subRequest,
      fullName: `${request.name}/${subRequest.name}`,
    }));
  }

  const exact: Partial<ExactDeviceRequest> = request.exactly ?? request;

  return [{
    name: request.name,
    fullName: request.name,
    deviceClassName: exact.deviceClassName ?? "",
    selectors: exact.selectors,
    allocationMode: exact.allocationMode,
    count: exact.count,
    adminAccess: exact.adminAccess,
    tolerations: exact.tolerations,
    capacity: exact.capacity,
  }];
};

export const formatRequestedCount = ({ allocationMode, count }: Pick<ExactDeviceRequest, "allocationMode" | "count">) => (
  allocationMode === "All"
    ? "All"
    : String(count ?? 1)
);

export const getDeviceProperties = (device: Device): DeviceProperties => device.basic ?? device;

export const formatDeviceCapacity = (capacity: DeviceCapacity | undefined) => (
  typeof capacity === "string"
    ? capacity
    : capacity?.value ?? ""
);

export const formatDeviceAttribute = (attribute: DeviceAttribute | undefined) => {
  const value = attribute?.string ?? attribute?.version ?? attribute?.int ?? attribute?.bool;

  return value === undefined ? "" : String(value);
};

const formatNodeSelectorRequirement = ({ key, operator, values }: NodeSelectorRequirement) => {
  switch (operator) {
    case "Exists":
      return key;
    case "DoesNotExist":
      return `!${key}`;
    case "In":
      return values?.length === 1 ? `${key}=${values[0]}` : `${key} in (${values?.join(", ") ?? ""})`;
    case "NotIn":
      return values?.length === 1 ? `${key}!=${values[0]}` : `${key} notin (${values?.join(", ") ?? ""})`;
    case "Gt":
      return `${key} > ${values?.[0] ?? ""}`;
    case "Lt":
      return `${key} < ${values?.[0] ?? ""}`;
    default:
      return `${key} ${operator} ${values?.join(", ") ?? ""}`;
  }
};

/**
 * One entry per node selector term, the terms are ORed
 */
export const formatNodeSelector = (selector: NodeSelector | undefined) => (
  selector?.nodeSelectorTerms?.map(term => [
    ...(term.matchFields ?? []),
    ...(term.matchExpressions ?? []),
  ].map(formatNodeSelectorRequirement).join(", ")) ?? []
);

/**
 * Allocations of node-local devices select exactly one node by name
 */
export const getSelectedNodeName = (selector: NodeSelector | undefined) => {
  const terms = selector?.nodeSelectorTerms ?? [];
  const [term] = terms;
  const [field] = term?.matchFields ?? [];

  if (
    terms.length === 1
    && !term.matchExpressions?.length
    && term.matchFields?.length === 1
    && field.key === "metadata.name"
    && field.operator === "In"
    && field.values?.length === 1
  ) {
    return field.values[0];
  }

  return undefined;
};
