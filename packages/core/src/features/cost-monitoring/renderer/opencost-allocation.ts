/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Values of the `window` query parameter of OpenCost. `month` is the current month to date.
 */
export type CostWindow = "24h" | "7d" | "30d" | "month";

export const costWindows: { value: CostWindow; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "Month to date" },
];

export type CostAggregation = "namespace" | "controller" | "pod" | "node" | "label";

export const costAggregations: { value: CostAggregation; label: string }[] = [
  { value: "namespace", label: "Namespace" },
  { value: "controller", label: "Controller" },
  { value: "pod", label: "Pod" },
  { value: "node", label: "Node" },
  { value: "label", label: "Label" },
];

export interface OpenCostAllocationQuery {
  window: CostWindow;

  /**
   * The value of the `aggregate` query parameter, e.g. `namespace` or `label:app`
   */
  aggregate: string;
}

/**
 * Where the OpenCost API is served, used to build a Kubernetes service proxy path
 */
export interface OpenCostServiceRef {
  namespace: string;
  name: string;
  port: string;
}

export const formatOpenCostServiceRef = ({ namespace, name, port }: OpenCostServiceRef) => `${namespace}/${name}:${port}`;

/**
 * Cost and efficiency numbers are rounded by OpenCost and are `null` when they are not finite
 */
type OpenCostNumber = number | null | undefined;

/**
 * One entry of an allocation set, keyed by the aggregated name. Only the fields used here are typed.
 *
 * Every cost has an adjustment counterpart which OpenCost includes in `totalCost`.
 */
export interface OpenCostAllocation {
  name?: string;
  properties?: {
    cluster?: string;
    node?: string;
    namespace?: string;
    controller?: string;
    controllerKind?: string;
    pod?: string;
  };
  start?: string;
  end?: string;
  minutes?: OpenCostNumber;
  cpuCost?: OpenCostNumber;
  cpuCostAdjustment?: OpenCostNumber;
  cpuEfficiency?: OpenCostNumber;
  gpuCost?: OpenCostNumber;
  gpuCostAdjustment?: OpenCostNumber;
  ramCost?: OpenCostNumber;
  ramCostAdjustment?: OpenCostNumber;
  ramEfficiency?: OpenCostNumber;
  pvCost?: OpenCostNumber;
  pvCostAdjustment?: OpenCostNumber;
  networkCost?: OpenCostNumber;
  networkCostAdjustment?: OpenCostNumber;
  loadBalancerCost?: OpenCostNumber;
  loadBalancerCostAdjustment?: OpenCostNumber;
  sharedCost?: OpenCostNumber;
  externalCost?: OpenCostNumber;
  totalCost?: OpenCostNumber;
  totalEfficiency?: OpenCostNumber;
}

/**
 * The envelope OpenCost writes for both successful and failed requests. `data` holds one
 * allocation set per step, a single one when `accumulate=true`.
 */
export interface OpenCostAllocationResponse {
  code?: number;
  message?: string;
  warning?: string;
  data?: (Record<string, OpenCostAllocation | null> | null)[] | null;
}

export interface CostAllocationRow {
  name: string;
  namespace?: string;
  cpuCost: number;
  gpuCost: number;
  ramCost: number;
  pvCost: number;
  networkCost: number;
  loadBalancerCost: number;
  sharedCost: number;
  externalCost: number;
  totalCost: number;

  /**
   * Ratios of used to requested resources, where 1 is fully used. Undefined when OpenCost could
   * not compute them.
   */
  cpuEfficiency?: number;
  ramEfficiency?: number;
  totalEfficiency?: number;
  start?: string;
  end?: string;
}

/**
 * Names OpenCost uses for costs which cannot be attributed to a single aggregate
 */
export const specialAllocationNames: Partial<Record<string, string>> = {
  __idle__: "Idle",
  __unallocated__: "Unallocated",
  __unmounted__: "Unmounted volumes",
};

export const isSpecialAllocationName = (name: string) => Boolean(specialAllocationNames[name]);

const finite = (value: OpenCostNumber) => (
  typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined
);

const amount = (cost: OpenCostNumber, adjustment?: OpenCostNumber) => (finite(cost) ?? 0) + (finite(adjustment) ?? 0);

const toRow = (key: string, allocation: OpenCostAllocation): CostAllocationRow => {
  const row: CostAllocationRow = {
    name: allocation.name || key,
    namespace: allocation.properties?.namespace || undefined,
    cpuCost: amount(allocation.cpuCost, allocation.cpuCostAdjustment),
    gpuCost: amount(allocation.gpuCost, allocation.gpuCostAdjustment),
    ramCost: amount(allocation.ramCost, allocation.ramCostAdjustment),
    pvCost: amount(allocation.pvCost, allocation.pvCostAdjustment),
    networkCost: amount(allocation.networkCost, allocation.networkCostAdjustment),
    loadBalancerCost: amount(allocation.loadBalancerCost, allocation.loadBalancerCostAdjustment),
    sharedCost: amount(allocation.sharedCost),
    externalCost: amount(allocation.externalCost),
    totalCost: 0,
    cpuEfficiency: finite(allocation.cpuEfficiency),
    ramEfficiency: finite(allocation.ramEfficiency),
    totalEfficiency: finite(allocation.totalEfficiency),
    start: allocation.start,
    end: allocation.end,
  };

  row.totalCost = finite(allocation.totalCost) ?? sumOfCosts(row);

  return row;
};

const sumOfCosts = (row: CostAllocationRow) => (
  row.cpuCost
  + row.gpuCost
  + row.ramCost
  + row.pvCost
  + row.networkCost
  + row.loadBalancerCost
  + row.sharedCost
  + row.externalCost
);

/**
 * Efficiencies of combined rows are weighted by the cost they relate to
 */
const weighted = (left: number | undefined, leftWeight: number, right: number | undefined, rightWeight: number) => {
  if (left === undefined || right === undefined) {
    return left ?? right;
  }

  const weight = leftWeight + rightWeight;

  return weight > 0
    ? (left * leftWeight + right * rightWeight) / weight
    : (left + right) / 2;
};

const earliest = (left?: string, right?: string) => (!left || (right && right < left) ? right : left);
const latest = (left?: string, right?: string) => (!left || (right && right > left) ? right : left);

const combineRows = (left: CostAllocationRow, right: CostAllocationRow): CostAllocationRow => ({
  name: left.name,
  namespace: left.namespace === right.namespace ? left.namespace : undefined,
  cpuCost: left.cpuCost + right.cpuCost,
  gpuCost: left.gpuCost + right.gpuCost,
  ramCost: left.ramCost + right.ramCost,
  pvCost: left.pvCost + right.pvCost,
  networkCost: left.networkCost + right.networkCost,
  loadBalancerCost: left.loadBalancerCost + right.loadBalancerCost,
  sharedCost: left.sharedCost + right.sharedCost,
  externalCost: left.externalCost + right.externalCost,
  totalCost: left.totalCost + right.totalCost,
  cpuEfficiency: weighted(left.cpuEfficiency, left.cpuCost, right.cpuEfficiency, right.cpuCost),
  ramEfficiency: weighted(left.ramEfficiency, left.ramCost, right.ramEfficiency, right.ramCost),
  totalEfficiency: weighted(
    left.totalEfficiency, left.cpuCost + left.ramCost,
    right.totalEfficiency, right.cpuCost + right.ramCost,
  ),
  start: earliest(left.start, right.start),
  end: latest(left.end, right.end),
});

/**
 * Flattens the allocation sets of a response into one row per aggregate. Sets of several steps
 * are summed up, in case the server did not accumulate them.
 */
export const toCostAllocationRows = (response: OpenCostAllocationResponse): CostAllocationRow[] => {
  const rows = new Map<string, CostAllocationRow>();

  for (const allocationSet of response.data ?? []) {
    for (const [key, allocation] of Object.entries(allocationSet ?? {})) {
      if (!allocation) {
        continue;
      }

      const row = toRow(key, allocation);
      const existing = rows.get(row.name);

      rows.set(row.name, existing ? combineRows(existing, row) : row);
    }
  }

  return [...rows.values()];
};

export type CostAllocationTotals = Omit<CostAllocationRow, "name" | "namespace" | "start" | "end">;

/**
 * Sums up costs and weighs efficiencies over all rows
 */
export const getCostAllocationTotals = (rows: CostAllocationRow[]): CostAllocationTotals => {
  const [first, ...rest] = rows;

  if (!first) {
    return {
      cpuCost: 0,
      gpuCost: 0,
      ramCost: 0,
      pvCost: 0,
      networkCost: 0,
      loadBalancerCost: 0,
      sharedCost: 0,
      externalCost: 0,
      totalCost: 0,
    };
  }

  const { name, namespace, start, end, ...totals } = rest.reduce(combineRows, first);

  return totals;
};
