/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { AsyncResult } from "@k8slens/utilities";
import apiKubeGetInjectable from "../../../renderer/k8s/api-kube-get.injectable";
import type { OpenCostServiceRef } from "./opencost-allocation";
import { getRequestErrorMessage } from "./request-error-message";

export type RequestOpenCostServices = () => AsyncResult<OpenCostServiceRef[]>;

interface ServiceData {
  metadata?: {
    name?: string;
    namespace?: string;
    labels?: Partial<Record<string, string>>;
  };
  spec?: {
    ports?: {
      name?: string;
      port?: number;
    }[];
  };
}

interface ServiceListData {
  items?: ServiceData[];
}

export const openCostServiceName = "opencost";
export const openCostNameLabel = "app.kubernetes.io/name";
export const openCostDefaultPort = "9003";

/**
 * The OpenCost API is served on the port named "http" by the official Helm chart, 9003 by default
 */
const pickApiPort = (service: ServiceData) => {
  const ports = service.spec?.ports ?? [];
  const port = ports.find(port => port.name === "http")
    ?? ports.find(port => String(port.port) === openCostDefaultPort)
    ?? ports[0];

  return port?.port ? String(port.port) : openCostDefaultPort;
};

const isOpenCostLabelled = (service: ServiceData) => service.metadata?.labels?.[openCostNameLabel] === openCostServiceName;

/**
 * Services carrying both the label and the name come first, as some charts also label their
 * UI or exporter services
 */
const rankOf = (service: ServiceData) => (
  (isOpenCostLabelled(service) ? 0 : 1)
  + (service.metadata?.name === openCostServiceName ? 0 : 2)
);

const toServiceRefs = (services: ServiceData[]): OpenCostServiceRef[] => {
  const refs = new Map<string, OpenCostServiceRef>();
  const ranked = services
    .filter(service => service.metadata?.name && service.metadata.namespace)
    .sort((left, right) => rankOf(left) - rankOf(right));

  for (const service of ranked) {
    const ref = {
      namespace: service.metadata?.namespace ?? "",
      name: service.metadata?.name ?? "",
      port: pickApiPort(service),
    };

    refs.set(`${ref.namespace}/${ref.name}`, refs.get(`${ref.namespace}/${ref.name}`) ?? ref);
  }

  return [...refs.values()];
};

/**
 * Looks for OpenCost services across the cluster: by label, then by name. When services cannot
 * be listed cluster wide, the default installation namespace is checked instead.
 */
const requestOpenCostServicesInjectable = getInjectable({
  id: "cost-monitoring-request-opencost-services",

  instantiate: (di): RequestOpenCostServices => {
    const apiKubeGet = di.inject(apiKubeGetInjectable);

    const listServices = (path: string, query: Partial<Record<string, string>>) => (
      apiKubeGet<ServiceListData>(path, { query })
        .then(list => list?.items ?? [])
    );

    return async () => {
      const results = await Promise.allSettled([
        listServices("/api/v1/services", { labelSelector: `${openCostNameLabel}=${openCostServiceName}` }),
        listServices("/api/v1/services", { fieldSelector: `metadata.name=${openCostServiceName}` }),
      ]);
      const services = results.flatMap(result => result.status === "fulfilled" ? result.value : []);

      if (services.length > 0 || results.some(result => result.status === "fulfilled")) {
        return { callWasSuccessful: true, response: toServiceRefs(services) };
      }

      try {
        const fallback = await listServices(`/api/v1/namespaces/${openCostServiceName}/services`, {});

        return { callWasSuccessful: true, response: toServiceRefs(fallback.filter(service => rankOf(service) < 3)) };
      } catch {
        const [first] = results;

        return {
          callWasSuccessful: false,
          error: getRequestErrorMessage(first.status === "rejected" ? first.reason : undefined),
        };
      }
    };
  },
});

export default requestOpenCostServicesInjectable;
