/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { AsyncResult } from "@k8slens/utilities";
import apiKubeGetInjectable from "../../../renderer/k8s/api-kube-get.injectable";
import type { OpenCostAllocationQuery, OpenCostAllocationResponse, OpenCostServiceRef } from "./opencost-allocation";
import { getRequestErrorMessage } from "./request-error-message";

export type RequestOpenCostAllocation = (
  service: OpenCostServiceRef,
  query: OpenCostAllocationQuery,
) => AsyncResult<OpenCostAllocationResponse>;

/**
 * The path of the OpenCost allocation API through the service proxy of the Kubernetes API, which
 * reuses the credentials of the cluster connection
 */
export const getOpenCostAllocationPath = ({ namespace, name, port }: OpenCostServiceRef) => (
  `/api/v1/namespaces/${encodeURIComponent(namespace)}/services/${encodeURIComponent(name)}:${encodeURIComponent(port)}/proxy/allocation/compute`
);

const requestOpenCostAllocationInjectable = getInjectable({
  id: "cost-monitoring-request-opencost-allocation",

  instantiate: (di): RequestOpenCostAllocation => {
    const apiKubeGet = di.inject(apiKubeGetInjectable);

    return async (service, { window, aggregate }) => {
      try {
        const response = await apiKubeGet<OpenCostAllocationResponse>(getOpenCostAllocationPath(service), {
          query: {
            window,
            aggregate,
            accumulate: "true",
          },
        });

        if (typeof response !== "object" || response === null) {
          return { callWasSuccessful: false, error: "OpenCost returned an unexpected response" };
        }

        if (typeof response.code === "number" && response.code >= 400) {
          return { callWasSuccessful: false, error: response.message || `OpenCost responded with code ${response.code}` };
        }

        return { callWasSuccessful: true, response };
      } catch (error) {
        return { callWasSuccessful: false, error: getRequestErrorMessage(error) };
      }
    };
  },
});

export default requestOpenCostAllocationInjectable;
