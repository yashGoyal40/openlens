/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { PodLogsQuery } from "@k8slens/kube-object";
import { podApiInjectable } from "@k8slens/kube-api-specifics";
import type { ResourceDescriptor } from "@k8slens/kube-api";

/**
 * The query parameters of the pod logs request
 */
export interface PodLogsRequestQuery extends PodLogsQuery {
  /**
   * Only return logs newer than this many seconds, mutually exclusive with `sinceTime`
   */
  sinceSeconds?: number;
}

export type CallForLogs = (params: ResourceDescriptor, query?: PodLogsRequestQuery) => Promise<string>;

const callForLogsInjectable = getInjectable({
  id: "call-for-logs",
  instantiate: (di): CallForLogs => {
    const api = di.inject(podApiInjectable);

    return (params, query) => api.getLogs(params, query);
  },
});

export default callForLogsInjectable;
