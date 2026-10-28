/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import apiKubeGetInjectable from "../../k8s/api-kube-get.injectable";

export interface VolumeUsage {
  /**
   * In bytes
   */
  used: number;
  /**
   * In bytes
   */
  capacity: number;
}

interface StatsSummary {
  pods?: {
    volume?: {
      pvcRef?: { name?: string; namespace?: string };
      usedBytes?: number;
      capacityBytes?: number;
    }[];
  }[];
}

export const getVolumeUsageKey = (namespace: string, claim: string) => `${namespace}/${claim}`;

export type RequestVolumeUsage = (nodeName: string) => Promise<Map<string, VolumeUsage>>;

/**
 * The usage of every persistent volume claim mounted on a node, from the stats summary of its kubelet
 */
const requestVolumeUsageInjectable = getInjectable({
  id: "request-volume-usage",

  instantiate: (di): RequestVolumeUsage => {
    const apiKubeGet = di.inject(apiKubeGetInjectable);

    return async (nodeName) => {
      const summary = await apiKubeGet(`/api/v1/nodes/${nodeName}/proxy/stats/summary`) as StatsSummary | undefined;
      const usage = new Map<string, VolumeUsage>();

      for (const { volume = [] } of summary?.pods ?? []) {
        for (const { pvcRef, usedBytes, capacityBytes } of volume) {
          if (pvcRef?.name && pvcRef.namespace && usedBytes !== undefined && capacityBytes !== undefined) {
            usage.set(getVolumeUsageKey(pvcRef.namespace, pvcRef.name), { used: usedBytes, capacity: capacityBytes });
          }
        }
      }

      return usage;
    };
  },
});

export default requestVolumeUsageInjectable;
