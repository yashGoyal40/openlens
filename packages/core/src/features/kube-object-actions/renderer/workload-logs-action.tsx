/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { DaemonSet, Deployment, Job, Pod, ReplicaSet, StatefulSet } from "@k8slens/kube-object";
import type { PodApi } from "@k8slens/kube-api";
import { podApiInjectable } from "@k8slens/kube-api-specifics";
import { Icon } from "@k8slens/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { ShowCheckedErrorNotification, ShowNotification } from "@k8slens/notifications";
import { showCheckedErrorNotificationInjectable, showInfoNotificationInjectable } from "@k8slens/notifications";
import type { KubeObjectMenuProps } from "../../../renderer/components/kube-object-menu";
import { MenuItem } from "../../../renderer/components/menu";
import type { CreateLogsTabData } from "../../../renderer/components/dock/logs/create-logs-tab.injectable";
import createLogsTabInjectable from "../../../renderer/components/dock/logs/create-logs-tab.injectable";
import type { HideDetails } from "../../../renderer/components/kube-detail-params/hide-details.injectable";
import hideDetailsInjectable from "../../../renderer/components/kube-detail-params/hide-details.injectable";

export type LoggableWorkload = Deployment | StatefulSet | DaemonSet | ReplicaSet | Job;

export interface WorkloadLogsActionProps extends KubeObjectMenuProps<LoggableWorkload> {}

interface Dependencies {
  createLogsTab: (title: string, data: CreateLogsTabData) => string;
  podApi: PodApi;
  showInfoNotification: ShowNotification;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  hideDetails: HideDetails;
}

/**
 * Prefer a running pod so the first logs shown are live ones
 */
export const pickPodForLogs = (pods: Pod[]) => (
  pods.find(pod => pod.getStatusMessage() === "Running")
  ?? pods[0]
);

const NonInjectedWorkloadLogsAction = ({
  object: workload,
  toolbar,
  createLogsTab,
  podApi,
  showInfoNotification,
  showCheckedErrorNotification,
  hideDetails,
}: Dependencies & WorkloadLogsActionProps) => {
  const showLogs = async () => {
    try {
      const pods = await podApi.list(
        { namespace: workload.getNs() },
        { labelSelector: workload.getSelectors() },
      ) ?? [];
      const pod = pickPodForLogs(pods);
      const [container] = pod?.getAllContainers() ?? [];

      if (!pod || !container) {
        showInfoNotification(`${workload.kind} ${workload.getName()} has no pods to show logs for`);

        return;
      }

      createLogsTab(`${workload.kind} ${workload.getName()}`, {
        // the direct owner, so the tab can switch between sibling pods (e.g. the ReplicaSet of a Deployment)
        owner: pod.getOwnerRefs()[0],
        namespace: pod.getNs(),
        selectedPodId: pod.getId(),
        selectedContainer: container.name,
      });
      hideDetails();
    } catch (error) {
      showCheckedErrorNotification(error, `Unknown error occurred while opening logs for ${workload.getName()}`);
    }
  };

  return (
    <MenuItem onClick={() => void showLogs()} data-testid="workload-action-logs">
      <Icon
        material="subject"
        interactive={toolbar}
        tooltip={toolbar ? "Logs" : undefined}
      />
      <span className="title">Logs</span>
    </MenuItem>
  );
};

export const WorkloadLogsAction = withInjectables<Dependencies, WorkloadLogsActionProps>(NonInjectedWorkloadLogsAction, {
  getProps: (di, props) => ({
    ...props,
    createLogsTab: di.inject(createLogsTabInjectable),
    podApi: di.inject(podApiInjectable),
    showInfoNotification: di.inject(showInfoNotificationInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    hideDetails: di.inject(hideDetailsInjectable),
  }),
});
