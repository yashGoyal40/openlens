/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import apiKubeGetInjectable from "../../../k8s/api-kube-get.injectable";
import type { PodUsageReport } from "./pod-usage-history";

interface PodMetricsResponse {
  metadata?: { name?: string; namespace?: string };
  timestamp?: string;
  containers?: PodUsageReport["containers"];
}

export type RequestPodUsage = (namespace: string, name: string) => Promise<PodUsageReport | undefined>;

/**
 * Current usage of one pod from metrics-server
 */
const requestPodUsageInjectable = getInjectable({
  id: "request-pod-usage",

  instantiate: (di): RequestPodUsage => {
    const apiKubeGet = di.inject(apiKubeGetInjectable);

    return async (namespace, name) => {
      const response = await apiKubeGet(`/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods/${name}`) as PodMetricsResponse | undefined;

      if (!response?.timestamp) {
        return undefined;
      }

      return {
        name: response.metadata?.name ?? name,
        namespace: response.metadata?.namespace ?? namespace,
        timestamp: response.timestamp,
        containers: response.containers ?? [],
      };
    };
  },
});

export default requestPodUsageInjectable;
