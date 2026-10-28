/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./cluster-summary.module.scss";

import React from "react";
import { observer } from "mobx-react";
import type { IComputedValue } from "mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import { bytesToUnits, cssNames } from "@k8slens/utilities";
import { Icon } from "@k8slens/icon";
import type { ClusterResourceSummary } from "./cluster-resource-summary";
import clusterResourceSummaryInjectable from "./cluster-resource-summary.injectable";

interface Dependencies {
  summary: IComputedValue<ClusterResourceSummary>;
}

const formatCores = (value: number) => `${Number(value.toFixed(2))}`;

const percentOf = (value: number | undefined, total: number | undefined) => (
  value !== undefined && total
    ? Math.min(100, Math.round((value / total) * 100))
    : undefined
);

interface TileProps {
  id: string;
  icon: string;
  title: string;
  value: string;
  /**
   * Shown smaller after the value, eg. "of 16 cores"
   */
  total?: string;
  details: string;
  percent?: number;
  color?: string;
}

const Tile = ({ id, icon, title, value, total, details, percent, color }: TileProps) => (
  <div className={styles.tile} data-testid={`cluster-summary-${id}`}>
    <div className={styles.tileTitle}>
      <Icon material={icon} small />
      {title}
    </div>
    <div className={styles.value}>
      {value}
      {total && <span className={styles.total}>{total}</span>}
    </div>
    {percent !== undefined && (
      <div className={styles.bar} title={`${percent}%`}>
        <div style={{ width: `${percent}%`, background: color }} />
      </div>
    )}
    <div className={styles.details}>{details}</div>
  </div>
);

const NonInjectedClusterSummary = observer(({ summary }: Dependencies) => {
  const { nodes, pods, points, hasUsage } = summary.get();
  const {
    cpuUsage, cpuRequests = 0, cpuAllocatableCapacity = 0,
    memoryUsage, memoryRequests = 0, memoryAllocatableCapacity = 0,
  } = points;

  return (
    <div className={cssNames(styles.ClusterSummary)} data-testid="cluster-summary">
      <div className={styles.header}>
        <h3>Cluster Summary</h3>
        <span className={styles.source}>
          {hasUsage ? "Live usage from metrics-server" : "Install metrics-server to see live usage"}
        </span>
      </div>
      <div className={styles.tiles}>
        <Tile
          id="nodes"
          icon="dns"
          title="Nodes"
          value={`${nodes.total}`}
          details={`${nodes.ready} ready${nodes.pools ? ` · ${nodes.pools} node pool${nodes.pools === 1 ? "" : "s"}` : ""}`}
          percent={percentOf(nodes.ready, nodes.total)}
          color="var(--colorSuccess)"
        />
        <Tile
          id="pods"
          icon="view_in_ar"
          title="Pods"
          value={`${pods.total}`}
          details={[
            `${pods.running} running`,
            pods.pending && `${pods.pending} pending`,
            pods.succeeded && `${pods.succeeded} completed`,
            pods.failed && `${pods.failed} failed`,
          ].filter(Boolean).join(" · ")}
          percent={percentOf(points.podUsage, points.podAllocatableCapacity)}
          color="#4caf50"
        />
        <Tile
          id="cpu"
          icon="memory"
          title="CPU"
          value={`${formatCores(cpuUsage ?? cpuAllocatableCapacity)} cores`}
          total={cpuUsage !== undefined ? `of ${formatCores(cpuAllocatableCapacity)}` : "allocatable"}
          details={`Requests ${formatCores(cpuRequests)} cores (${percentOf(cpuRequests, cpuAllocatableCapacity) ?? 0}%)`}
          percent={percentOf(cpuUsage, cpuAllocatableCapacity)}
          color="#3d90ce"
        />
        <Tile
          id="memory"
          icon="sd_storage"
          title="Memory"
          value={bytesToUnits(memoryUsage ?? memoryAllocatableCapacity)}
          total={memoryUsage !== undefined ? `of ${bytesToUnits(memoryAllocatableCapacity)}` : "allocatable"}
          details={`Requests ${bytesToUnits(memoryRequests)} (${percentOf(memoryRequests, memoryAllocatableCapacity) ?? 0}%)`}
          percent={percentOf(memoryUsage, memoryAllocatableCapacity)}
          color="#c93dce"
        />
      </div>
    </div>
  );
});

export const ClusterSummary = withInjectables<Dependencies>(NonInjectedClusterSummary, {
  getProps: (di, props) => ({
    ...props,
    summary: di.inject(clusterResourceSummaryInjectable).value,
  }),
});
