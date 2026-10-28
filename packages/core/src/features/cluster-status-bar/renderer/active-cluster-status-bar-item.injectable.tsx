/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { computed } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { ClusterGlyph, getEntityColor } from "../../../renderer/components/cluster-glyph";
import type { KubernetesCluster } from "../../../common/catalog-entities";
import activeKubernetesClusterInjectable from "../../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";
import { statusBarItemInjectionToken } from "../../../renderer/components/status-bar/status-bar-item-injection-token";

interface Dependencies {
  activeKubernetesCluster: IComputedValue<KubernetesCluster | null>;
}

export const formatActiveCluster = (cluster: KubernetesCluster) => {
  const version = cluster.metadata.kubeVersion;

  return version && version !== "unknown"
    ? `${cluster.getName()} (${version})`
    : cluster.getName();
};

const NonInjectedActiveClusterStatus = observer(({ activeKubernetesCluster }: Dependencies) => {
  const cluster = activeKubernetesCluster.get();

  if (!cluster) {
    return null;
  }

  return (
    <div className="flex gaps align-center" data-testid="active-cluster-status">
      <ClusterGlyph color={getEntityColor(cluster)} size={13} />
      <span>{formatActiveCluster(cluster)}</span>
    </div>
  );
});

const ActiveClusterStatus = withInjectables<Dependencies>(NonInjectedActiveClusterStatus, {
  getProps: (di, props) => ({
    ...props,
    activeKubernetesCluster: di.inject(activeKubernetesClusterInjectable),
  }),
});

const activeClusterStatusBarItemInjectable = getInjectable({
  id: "active-cluster-status-bar-item",

  instantiate: (di) => {
    const activeKubernetesCluster = di.inject(activeKubernetesClusterInjectable);

    return {
      component: ActiveClusterStatus,
      position: "left" as const,
      visible: computed(() => Boolean(activeKubernetesCluster.get())),
    };
  },

  injectionToken: statusBarItemInjectionToken,
});

export default activeClusterStatusBarItemInjectable;
