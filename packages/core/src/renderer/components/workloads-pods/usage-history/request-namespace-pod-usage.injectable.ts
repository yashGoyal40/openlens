/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import apiKubeGetInjectable from "../../../k8s/api-kube-get.injectable";
import type { PodUsageReport } from "./pod-usage-history";

interface PodMetricsListResponse {
  items?: {
    metadata?: { name?: string; namespace?: string };
    timestamp?: string;
    containers?: PodUsageReport["containers"];
  }[];
}

export type RequestNamespacePodUsage = (namespace: string) => Promise<PodUsageReport[]>;

/**
 * Current usage of every pod in a namespace from metrics-server
 */
const requestNamespacePodUsageInjectable = getInjectable({
  id: "request-namespace-pod-usage",

  instantiate: (di): RequestNamespacePodUsage => {
    const apiKubeGet = di.inject(apiKubeGetInjectable);

    return async (namespace) => {
      const response = await apiKubeGet(`/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods`) as PodMetricsListResponse | undefined;

      return (response?.items ?? []).flatMap(({ metadata, timestamp, containers }) => (
        metadata?.name && timestamp
          ? [{
            name: metadata.name,
            namespace: metadata.namespace ?? namespace,
            timestamp,
            containers: containers ?? [],
          }]
          : []
      ));
    };
  },
});

export default requestNamespacePodUsageInjectable;
