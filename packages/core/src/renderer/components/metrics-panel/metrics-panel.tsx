/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./metrics-panel.module.scss";
import React from "react";
import { Icon } from "@k8slens/icon";
import { cssNames } from "@k8slens/utilities";
import type { StrictReactNode } from "@k8slens/utilities";
import type { MetricsTab } from "../chart/options";
import { Select } from "../select";

const minute = 60 * 1000;

export const metricsRanges = [
  { value: 15 * minute, label: "15m" },
  { value: 60 * minute, label: "1h" },
  { value: 3 * 60 * minute, label: "3h" },
  { value: 6 * 60 * minute, label: "6h" },
];

export const defaultMetricsRange = 60 * minute;

const tabIcons: Partial<Record<MetricsTab, string>> = {
  CPU: "memory",
  Memory: "sd_card",
  Network: "swap_vert",
  Filesystem: "storage",
  Disk: "storage",
  Pods: "apps",
};

export interface MetricsPanelProps {
  id: string;
  tabs: MetricsTab[];
  tab: MetricsTab;
  onTabChange: (tab: MetricsTab) => void;

  /**
   * Tabs the source cannot fill, with the reason shown on hover
   */
  unavailableTabs?: Partial<Record<MetricsTab, string>>;

  /**
   * The range can only be picked when the source keeps its own history
   */
  range?: number;
  onRangeChange?: (range: number) => void;
  source: string;
  children: StrictReactNode;
}

export function MetricsPanel({ id, tabs, tab, onTabChange, unavailableTabs = {}, range, onRangeChange, source, children }: MetricsPanelProps) {
  return (
    <div className={styles.MetricsPanel} data-testid={`metrics-panel-${id}`}>
      <div className={styles.toolbar}>
        {range !== undefined && onRangeChange && (
          <Select
            id={`metrics-range-${id}`}
            className={styles.range}
            menuClass={styles.rangeMenu}
            options={metricsRanges}
            value={range}
            onChange={option => option && onRangeChange(option.value)}
            isSearchable={false}
          />
        )}
        <div className={styles.tabs} role="tablist">
          {tabs.map(each => {
            const unavailable = unavailableTabs[each];

            return (
              <button
                key={each}
                type="button"
                role="tab"
                className={cssNames(styles.tab, { [styles.active]: each === tab })}
                aria-selected={each === tab}
                title={unavailable ? `${each}: ${unavailable}` : each}
                disabled={Boolean(unavailable)}
                onClick={() => onTabChange(each)}
                data-testid={`metrics-tab-${id}-${each}`}
              >
                <Icon material={tabIcons[each] ?? "show_chart"} />
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.source}>
        {`Displaying metrics from ${source}`}
      </div>
      <div className={styles.graph}>
        {children}
      </div>
    </div>
  );
}
