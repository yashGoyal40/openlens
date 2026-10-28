/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { Node } from "@k8slens/kube-object";
import type { NodeApi } from "@k8slens/kube-api";
import { nodeApiInjectable } from "@k8slens/kube-api-specifics";
import { Icon } from "@k8slens/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { ShowCheckedErrorNotification } from "@k8slens/notifications";
import { showCheckedErrorNotificationInjectable } from "@k8slens/notifications";
import type { KubeObjectMenuProps } from "../../../renderer/components/kube-object-menu";
import { MenuItem } from "../../../renderer/components/menu";
import type { DockTab, DockTabCreateSpecific } from "../../../renderer/components/dock/dock/store";
import createTerminalTabInjectable from "../../../renderer/components/dock/terminal/create-terminal-tab.injectable";
import type { SendCommand } from "../../../renderer/components/dock/terminal/send-command.injectable";
import sendCommandInjectable from "../../../renderer/components/dock/terminal/send-command.injectable";
import type { OpenConfirmDialog } from "../../../renderer/components/confirm-dialog/open.injectable";
import openConfirmDialogInjectable from "../../../renderer/components/confirm-dialog/open.injectable";
import type { HideDetails } from "../../../renderer/components/kube-detail-params/hide-details.injectable";
import hideDetailsInjectable from "../../../renderer/components/kube-detail-params/hide-details.injectable";
import { getNodeDrainCommand } from "./kubectl-commands";
import { isErrorAlreadyShown } from "./is-error-already-shown";

export interface NodeActionsProps extends KubeObjectMenuProps<Node> {}

interface Dependencies {
  createTerminalTab: (tabParams: DockTabCreateSpecific) => DockTab;
  sendCommand: SendCommand;
  openConfirmDialog: OpenConfirmDialog;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  nodeApi: NodeApi;
  hideDetails: HideDetails;
}

const NonInjectedNodeActions = ({
  object: node,
  toolbar,
  createTerminalTab,
  sendCommand,
  openConfirmDialog,
  showCheckedErrorNotification,
  nodeApi,
  hideDetails,
}: Dependencies & NodeActionsProps) => {
  const nodeName = node.getName();
  const isUnschedulable = Boolean(node.isUnschedulable());

  // the dock opens below the details drawer, so get it out of the way
  const openShell = () => {
    createTerminalTab({
      title: `Node: ${nodeName}`,
      node: nodeName,
    });
    hideDetails();
  };
  const setUnschedulable = async (unschedulable: boolean) => {
    try {
      await nodeApi.patch({ name: nodeName }, { spec: { unschedulable }}, "strategic");
    } catch (error) {
      if (!isErrorAlreadyShown(error)) {
        showCheckedErrorNotification(error, `Unknown error occurred while ${unschedulable ? "cordoning" : "uncordoning"} node ${nodeName}`);
      }
    }
  };
  const drain = () => openConfirmDialog({
    ok: () => {
      const tab = createTerminalTab({ title: `Drain: ${nodeName}` });

      hideDetails();
      void sendCommand(getNodeDrainCommand(nodeName), { enter: true, tabId: tab.id });
    },
    labelOk: "Drain Node",
    message: (
      <p>
        {"Are you sure you want to drain node "}
        <b>{nodeName}</b>
        ? All pods except DaemonSet pods will be evicted, including pods with emptyDir data.
      </p>
    ),
  });

  return (
    <>
      <MenuItem onClick={openShell} data-testid="node-action-shell">
        <Icon
          svg="ssh"
          interactive={toolbar}
          tooltip={toolbar ? "Node shell" : undefined}
        />
        <span className="title">Shell</span>
      </MenuItem>
      {isUnschedulable
        ? (
          <MenuItem onClick={() => void setUnschedulable(false)} data-testid="node-action-uncordon">
            <Icon
              material="play_circle_filled"
              interactive={toolbar}
              tooltip={toolbar ? "Uncordon" : undefined}
            />
            <span className="title">Uncordon</span>
          </MenuItem>
        )
        : (
          <MenuItem onClick={() => void setUnschedulable(true)} data-testid="node-action-cordon">
            <Icon
              material="pause_circle_filled"
              interactive={toolbar}
              tooltip={toolbar ? "Cordon" : undefined}
            />
            <span className="title">Cordon</span>
          </MenuItem>
        )}
      <MenuItem onClick={drain} data-testid="node-action-drain">
        <Icon
          material="delete_sweep"
          interactive={toolbar}
          tooltip={toolbar ? "Drain" : undefined}
        />
        <span className="title">Drain</span>
      </MenuItem>
    </>
  );
};

export const NodeActions = withInjectables<Dependencies, NodeActionsProps>(NonInjectedNodeActions, {
  getProps: (di, props) => ({
    ...props,
    createTerminalTab: di.inject(createTerminalTabInjectable),
    sendCommand: di.inject(sendCommandInjectable),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    nodeApi: di.inject(nodeApiInjectable),
    hideDetails: di.inject(hideDetailsInjectable),
  }),
});
