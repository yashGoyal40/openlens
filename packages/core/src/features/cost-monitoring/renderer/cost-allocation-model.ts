/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { IReactionDisposer } from "mobx";
import { action, comparer, computed, observable, reaction } from "mobx";
import type { StorageLayer } from "../../../renderer/utils/storage-helper";
import type { CostMonitoringSettings } from "./cost-monitoring-settings.injectable";
import { defaultCostMonitoringSettings } from "./cost-monitoring-settings.injectable";
import type { OpenCostDiscovery } from "./opencost-discovery.injectable";
import type { CostAllocationRow, OpenCostAllocationQuery, OpenCostServiceRef } from "./opencost-allocation";
import { toCostAllocationRows } from "./opencost-allocation";
import type { RequestOpenCostAllocation } from "./request-opencost-allocation.injectable";
import { openCostDefaultPort } from "./request-opencost-services.injectable";

export type CostAllocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; rows: CostAllocationRow[]; warning?: string }
  | { status: "failed"; error: string };

export interface CostAllocationModelDependencies {
  readonly discovery: OpenCostDiscovery;
  readonly settingsStorage: StorageLayer<CostMonitoringSettings>;
  readonly requestOpenCostAllocation: RequestOpenCostAllocation;
}

/**
 * Loads allocations of the effective OpenCost service whenever the service or the query changes
 */
export class CostAllocationModel {
  private readonly allocation = observable.box<CostAllocationState>({ status: "idle" }, { deep: false });
  private latestRequestId = 0;

  constructor(
    private readonly dependencies: CostAllocationModelDependencies,

    /**
     * Returns `undefined` while the query is incomplete
     */
    private readonly getQuery: () => OpenCostAllocationQuery | undefined,
  ) {}

  /**
   * Stored settings completed with defaults, in case they were stored by an older version
   */
  readonly settings = computed((): CostMonitoringSettings => ({
    ...defaultCostMonitoringSettings,
    ...this.dependencies.settingsStorage.get(),
  }));

  readonly isServiceOverridden = computed(() => {
    const { serviceNamespace, serviceName, servicePort } = this.settings.get();

    return Boolean(serviceNamespace.trim() || serviceName.trim() || servicePort.trim());
  });

  /**
   * The discovered service with the overrides of the user applied
   */
  readonly service = computed((): OpenCostServiceRef | undefined => {
    const { serviceNamespace, serviceName, servicePort } = this.settings.get();
    const discovered = this.dependencies.discovery.service.get();
    const namespace = serviceNamespace.trim() || discovered?.namespace;
    const name = serviceName.trim() || discovered?.name;

    if (!namespace || !name) {
      return undefined;
    }

    const isDiscovered = discovered?.namespace === namespace && discovered.name === name;

    return {
      namespace,
      name,
      port: servicePort.trim() || (isDiscovered ? discovered.port : openCostDefaultPort),
    };
  }, { equals: comparer.structural });

  readonly state = computed(() => this.allocation.get());

  /**
   * Starts loading, returns a disposer which stops reacting to changes
   */
  start(): IReactionDisposer {
    return reaction(
      () => ({ service: this.service.get(), query: this.getQuery() }),
      ({ service, query }) => void this.load(service, query),
      {
        fireImmediately: true,
        equals: comparer.structural,
      },
    );
  }

  reload() {
    void this.load(this.service.get(), this.getQuery());
  }

  private readonly setState = action((state: CostAllocationState) => this.allocation.set(state));

  private async load(service: OpenCostServiceRef | undefined, query: OpenCostAllocationQuery | undefined) {
    const requestId = ++this.latestRequestId;

    if (!service || !query) {
      this.setState({ status: "idle" });

      return;
    }

    this.setState({ status: "loading" });

    const result = await this.dependencies.requestOpenCostAllocation(service, query);

    // a newer request was made in the meantime
    if (requestId !== this.latestRequestId) {
      return;
    }

    if (result.callWasSuccessful) {
      this.setState({
        status: "loaded",
        rows: toCostAllocationRows(result.response),
        warning: result.response.warning,
      });
    } else {
      this.setState({ status: "failed", error: result.error });
    }
  }
}
