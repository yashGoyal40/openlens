/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import type { KubeObjectMenuItemComponent } from "../../../renderer/components/kube-object-menu/kube-object-menu-item-injection-token";
import { kubeObjectMenuItemInjectionToken } from "../../../renderer/components/kube-object-menu/kube-object-menu-item-injection-token";
import { PodActions } from "./pod-actions";
import { NodeActions } from "./node-actions";
import { WorkloadLogsAction } from "./workload-logs-action";

export const podActionsMenuItemInjectable = getInjectable({
  id: "pod-actions-kube-object-menu-item",

  instantiate: () => ({
    kind: "Pod",
    apiVersions: ["v1"],
    Component: PodActions as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 10,
  }),

  injectionToken: kubeObjectMenuItemInjectionToken,
});

export const nodeActionsMenuItemInjectable = getInjectable({
  id: "node-actions-kube-object-menu-item",

  instantiate: () => ({
    kind: "Node",
    apiVersions: ["v1"],
    Component: NodeActions as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 10,
  }),

  injectionToken: kubeObjectMenuItemInjectionToken,
});

const createWorkloadLogsMenuItemInjectable = (kind: string, apiVersions: string[]) => getInjectable({
  id: `workload-logs-kube-object-menu-item-${kind}`,

  instantiate: () => ({
    kind,
    apiVersions,
    Component: WorkloadLogsAction as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 40,
  }),

  injectionToken: kubeObjectMenuItemInjectionToken,
});

export const deploymentLogsMenuItemInjectable = createWorkloadLogsMenuItemInjectable("Deployment", ["apps/v1"]);
export const statefulSetLogsMenuItemInjectable = createWorkloadLogsMenuItemInjectable("StatefulSet", ["apps/v1"]);
export const daemonSetLogsMenuItemInjectable = createWorkloadLogsMenuItemInjectable("DaemonSet", ["apps/v1"]);
export const replicaSetLogsMenuItemInjectable = createWorkloadLogsMenuItemInjectable("ReplicaSet", ["apps/v1"]);
export const jobLogsMenuItemInjectable = createWorkloadLogsMenuItemInjectable("Job", ["batch/v1"]);
