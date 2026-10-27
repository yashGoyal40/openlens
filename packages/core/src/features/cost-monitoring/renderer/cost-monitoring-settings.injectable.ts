/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../renderer/utils/create-storage/create-storage.injectable";
import type { CostAggregation, CostWindow } from "./opencost-allocation";

export interface CostMonitoringSettings {
  window: CostWindow;
  aggregation: CostAggregation;
  labelKey: string;

  /**
   * ISO 4217 code of the currency OpenCost is configured with
   */
  currency: string;

  /**
   * Overrides of the discovered OpenCost service, empty when not overridden
   */
  serviceNamespace: string;
  serviceName: string;
  servicePort: string;
}

export const defaultCostMonitoringSettings: CostMonitoringSettings = {
  window: "7d",
  aggregation: "namespace",
  labelKey: "",
  currency: "USD",
  serviceNamespace: "",
  serviceName: "",
  servicePort: "",
};

/**
 * Within a cluster frame the storage is kept per cluster
 */
const costMonitoringSettingsInjectable = getInjectable({
  id: "cost-monitoring-settings",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<CostMonitoringSettings>("cost_monitoring", defaultCostMonitoringSettings);
  },
});

export default costMonitoringSettingsInjectable;
