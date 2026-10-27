/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { Container, Pod } from "@k8slens/kube-object";
import type { PodApi } from "@k8slens/kube-api";
import { podApiInjectable } from "@k8slens/kube-api-specifics";
import { Icon } from "@k8slens/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { ShowCheckedErrorNotification, ShowNotification } from "@k8slens/notifications";
import { showCheckedErrorNotificationInjectable, showSuccessNotificationInjectable } from "@k8slens/notifications";
import type { KubeObjectMenuProps } from "../../../renderer/components/kube-object-menu";
import { MenuItem } from "../../../renderer/components/menu";
import type { DockTab, DockTabCreateSpecific } from "../../../renderer/components/dock/dock/store";
import createTerminalTabInjectable from "../../../renderer/components/dock/terminal/create-terminal-tab.injectable";
import type { SendCommand } from "../../../renderer/components/dock/terminal/send-command.injectable";
import sendCommandInjectable from "../../../renderer/components/dock/terminal/send-command.injectable";
import type { PodLogsTabData } from "../../../renderer/components/dock/logs/create-pod-logs-tab.injectable";
import createPodLogsTabInjectable from "../../../renderer/components/dock/logs/create-pod-logs-tab.injectable";
import type { OpenConfirmDialog } from "../../../renderer/components/confirm-dialog/open.injectable";
import openConfirmDialogInjectable from "../../../renderer/components/confirm-dialog/open.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import type { HideDetails } from "../../../renderer/components/kube-detail-params/hide-details.injectable";
import hideDetailsInjectable from "../../../renderer/components/kube-detail-params/hide-details.injectable";
import { ContainerMenuItem } from "./container-menu-item";
import { getPodAttachCommand, getPodShellCommand } from "./kubectl-commands";

export interface PodActionsProps extends KubeObjectMenuProps<Pod> {}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => DockTab;
  sendCommand: SendCommand;
  createPodLogsTab: (data: PodLogsTabData) => string;
  openConfirmDialog: OpenConfirmDialog;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  showSuccessNotification: ShowNotification;
  podApi: PodApi;
  isWindows: boolean;
  hideDetails: HideDetails;
}

const NonInjectedPodActions = ({
  object: pod,
  toolbar,
  createTerminalTab,
  sendCommand,
  createPodLogsTab,
  openConfirmDialog,
  showCheckedErrorNotification,
  showSuccessNotification,
  podApi,
  isWindows,
  hideDetails,
}: Dependencies & PodActionsProps) => {
  // the dock opens below the details drawer, so get it out of the way
  const runInTerminal = (title: string, command: string) => {
    const tab = createTerminalTab({ title });

    hideDetails();
    void sendCommand(command, { enter: true, tabId: tab.id });
  };
  const toTarget = (container: Container) => ({
    podName: pod.getName(),
    namespace: pod.getNs(),
    containerName: container.name,
  });

  const execShell = (container: Container) => runInTerminal(
    `Pod: ${pod.getName()} (namespace: ${pod.getNs()})`,
    getPodShellCommand(toTarget(container), {
      isWindowsHost: isWindows,
      isWindowsPod: pod.getSelectedNodeOs() === "windows",
    }),
  );
  const attach = (container: Container) => runInTerminal(
    `Attach: ${pod.getName()} (namespace: ${pod.getNs()})`,
    getPodAttachCommand(toTarget(container), { isWindowsHost: isWindows }),
  );
  const showLogs = (container: Container) => {
    createPodLogsTab({
      selectedPod: pod,
      selectedContainer: container,
    });
    hideDetails();
  };
  const evict = () => openConfirmDialog({
    ok: async () => {
      try {
        await podApi.evict({ name: pod.getName(), namespace: pod.getNs() });
        showSuccessNotification(`Pod ${pod.getName()} was evicted`);
        hideDetails();
      } catch (error) {
        showCheckedErrorNotification(error, `Unknown error occurred while evicting pod ${pod.getName()}`);
      }
    },
    labelOk: "Evict",
    message: (
      <p>
        {"Are you sure you want to evict pod "}
        <b>{pod.getName()}</b>
        ? It will be removed while respecting its PodDisruptionBudgets.
      </p>
    ),
  });

  const runningContainers = pod.getRunningContainers();

  return (
    <>
      <ContainerMenuItem
        pod={pod}
        containers={runningContainers}
        title="Attach Pod"
        icon={{ material: "pageview" }}
        toolbar={toolbar}
        onSelect={attach}
        data-testid="pod-action-attach"
      />
      <ContainerMenuItem
        pod={pod}
        containers={runningContainers}
        title="Shell"
        icon={{ svg: "ssh" }}
        toolbar={toolbar}
        onSelect={execShell}
        data-testid="pod-action-shell"
      />
      <MenuItem onClick={evict} data-testid="pod-action-evict">
        <Icon
          material="delete_sweep"
          interactive={toolbar}
          tooltip={toolbar ? "Evict" : undefined}
        />
        <span className="title">Evict</span>
      </MenuItem>
      <ContainerMenuItem
        pod={pod}
        containers={pod.getAllContainers()}
        title="Logs"
        icon={{ material: "subject" }}
        toolbar={toolbar}
        onSelect={showLogs}
        data-testid="pod-action-logs"
      />
    </>
  );
};

export const PodActions = withInjectables<Dependencies, PodActionsProps>(NonInjectedPodActions, {
  getProps: (di, props) => ({
    ...props,
    createTerminalTab: di.inject(createTerminalTabInjectable),
    sendCommand: di.inject(sendCommandInjectable),
    createPodLogsTab: di.inject(createPodLogsTabInjectable),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
    podApi: di.inject(podApiInjectable),
    isWindows: di.inject(isWindowsInjectable),
    hideDetails: di.inject(hideDetailsInjectable),
  }),
});
