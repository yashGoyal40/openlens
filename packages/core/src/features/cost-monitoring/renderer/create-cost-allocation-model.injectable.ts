/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { CostAllocationModel } from "./cost-allocation-model";
import costMonitoringSettingsInjectable from "./cost-monitoring-settings.injectable";
import type { OpenCostAllocationQuery } from "./opencost-allocation";
import openCostDiscoveryInjectable from "./opencost-discovery.injectable";
import requestOpenCostAllocationInjectable from "./request-opencost-allocation.injectable";

export type CreateCostAllocationModel = (getQuery: () => OpenCostAllocationQuery | undefined) => CostAllocationModel;

const createCostAllocationModelInjectable = getInjectable({
  id: "cost-monitoring-create-cost-allocation-model",

  instantiate: (di): CreateCostAllocationModel => {
    const dependencies = {
      discovery: di.inject(openCostDiscoveryInjectable),
      settingsStorage: di.inject(costMonitoringSettingsInjectable),
      requestOpenCostAllocation: di.inject(requestOpenCostAllocationInjectable),
    };

    return (getQuery) => new CostAllocationModel(dependencies, getQuery);
  },
});

export default createCostAllocationModelInjectable;
