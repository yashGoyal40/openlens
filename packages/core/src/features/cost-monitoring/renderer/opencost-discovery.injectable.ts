/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import { action, computed, observable, runInAction } from "mobx";
import type { OpenCostServiceRef } from "./opencost-allocation";
import requestOpenCostServicesInjectable from "./request-opencost-services.injectable";

export type OpenCostDiscoveryState =
  | { status: "idle" }
  | { status: "discovering" }
  | { status: "found"; services: OpenCostServiceRef[] }
  | { status: "missing" }
  | { status: "failed"; error: string };

export interface OpenCostDiscovery {
  readonly state: IComputedValue<OpenCostDiscoveryState>;

  /**
   * The first of the discovered services
   */
  readonly service: IComputedValue<OpenCostServiceRef | undefined>;

  /**
   * Discovers the service unless that was already attempted
   */
  discoverOnce(): void;

  /**
   * Discovers the service again unless it was found or is being discovered
   */
  discoverUnlessFound(): void;

  /**
   * Discovers the service again unless it is being discovered
   */
  rediscover(): void;
}

/**
 * The discovered service is kept for the lifetime of the cluster frame, as it is used by both the
 * cost page and the namespace details
 */
const openCostDiscoveryInjectable = getInjectable({
  id: "cost-monitoring-opencost-discovery",

  instantiate: (di): OpenCostDiscovery => {
    const requestOpenCostServices = di.inject(requestOpenCostServicesInjectable);
    const state = observable.box<OpenCostDiscoveryState>({ status: "idle" }, { deep: false });

    const discover = action(async () => {
      state.set({ status: "discovering" });

      const result = await requestOpenCostServices();

      runInAction(() => {
        if (!result.callWasSuccessful) {
          state.set({ status: "failed", error: result.error });
        } else if (result.response.length === 0) {
          state.set({ status: "missing" });
        } else {
          state.set({ status: "found", services: result.response });
        }
      });
    });

    return {
      state: computed(() => state.get()),
      service: computed(() => {
        const current = state.get();

        return current.status === "found"
          ? current.services[0]
          : undefined;
      }),
      discoverOnce: () => {
        if (state.get().status === "idle") {
          void discover();
        }
      },
      discoverUnlessFound: () => {
        const { status } = state.get();

        if (status !== "found" && status !== "discovering") {
          void discover();
        }
      },
      rediscover: () => {
        if (state.get().status !== "discovering") {
          void discover();
        }
      },
    };
  },
});

export default openCostDiscoveryInjectable;
