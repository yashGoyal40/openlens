/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { cpuUnitsToNumber, unitsToBytes } from "@k8slens/utilities";
import apiKubeGetInjectable from "../../k8s/api-kube-get.injectable";

export interface NodeUsage {
  /**
   * In cores
   */
  cpu: number;
  /**
   * In bytes
   */
  memory: number;
}

interface NodeMetricsList {
  items?: {
    metadata?: { name?: string };
    usage?: { cpu?: string; memory?: string };
  }[];
}

export type RequestNodeUsage = () => Promise<Map<string, NodeUsage>>;

/**
 * Current usage of every node from metrics-server, by node name
 */
const requestNodeUsageInjectable = getInjectable({
  id: "request-node-usage",

  instantiate: (di): RequestNodeUsage => {
    const apiKubeGet = di.inject(apiKubeGetInjectable);

    return async () => {
      const list = await apiKubeGet("/apis/metrics.k8s.io/v1beta1/nodes") as NodeMetricsList;
      const usage = new Map<string, NodeUsage>();

      for (const item of list?.items ?? []) {
        const name = item.metadata?.name;

        if (name && item.usage) {
          usage.set(name, {
            cpu: cpuUnitsToNumber(item.usage.cpu ?? "0") ?? 0,
            memory: unitsToBytes(item.usage.memory ?? "0"),
          });
        }
      }

      return usage;
    };
  },
});

export default requestNodeUsageInjectable;
