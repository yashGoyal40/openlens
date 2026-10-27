/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { ResourceDescriptor } from "@k8slens/kube-api";
import { loggerInjectionToken } from "@k8slens/logger";
import openSaveFileDialogInjectable from "../../../utils/save-file.injectable";
import { showErrorNotificationInjectable } from "@k8slens/notifications";
import type { PodLogsRequestQuery } from "./call-for-logs.injectable";
import callForLogsInjectable from "./call-for-logs.injectable";
import { callForMergedContainerLogs, removeLogTimestamp } from "./container-logs";

/**
 * Downloads all logs for `query`
 * @param containers When provided the logs of these containers are merged together, instead of
 * downloading the logs of `query.container`
 */
export type DownloadAllLogs = (params: ResourceDescriptor, query: PodLogsRequestQuery, containers?: string[]) => Promise<void>;

const downloadAllLogsInjectable = getInjectable({
  id: "download-all-logs",

  instantiate: (di): DownloadAllLogs => {
    const callForLogs = di.inject(callForLogsInjectable);
    const openSaveFileDialog = di.inject(openSaveFileDialogInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    const callForMergedLogs = async (params: ResourceDescriptor, query: PodLogsRequestQuery, containers: string[]) => {
      // The merged logs always have timestamps for sorting
      const lines = await callForMergedContainerLogs(callForLogs, params, containers, query);

      return (query.timestamps ? lines : lines.map(removeLogTimestamp)).join("\n");
    };

    return async (params, query, containers) => {
      const isMerged = containers !== undefined;
      const logs = await (
        isMerged
          ? callForMergedLogs(params, query, containers)
          : callForLogs(params, query)
      ).catch(error => {
        logger.error("Can't download logs: ", error);
      });

      if (logs) {
        openSaveFileDialog(`${isMerged ? params.name : query.container}.log`, logs, "text/plain");
      } else {
        showErrorNotification("No logs to download");
      }
    };
  },
});

export default downloadAllLogsInjectable;
