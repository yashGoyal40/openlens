/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useState } from "react";
import { observer } from "mobx-react";
import { now } from "mobx-utils";
import type { MetricsTab } from "../chart/options";
import type { UsageWindow } from "../workloads-pods/usage-history/usage-series";
import { getUsageUnit } from "../workloads-pods/usage-history/usage-series";
import { MetricsPanel, defaultMetricsRange } from "./metrics-panel";
import type { UsageSeries } from "./usage-chart";
import { UsageChart } from "./usage-chart";

export interface UsageMetricsProps {
  id: string;
  tabs: MetricsTab[];

  /**
   * Prometheus series, given when Prometheus has data, which then is shown instead of metrics-server
   */
  fromPrometheus?: (tab: MetricsTab) => UsageSeries[];
  fromMetricsServer: (tab: MetricsTab, window: UsageWindow) => UsageSeries[];

  /**
   * What fills in without Prometheus, metrics-server unless given
   */
  fallback?: {
    source: string;
    tabs: MetricsTab[];
  };
}

/**
 * Prometheus fills in a full hour by itself
 */
const prometheusRange = 60 * 60 * 1000;

const metricsServer = {
  source: "Kubernetes Metrics Server",
  tabs: ["CPU", "Memory"] as MetricsTab[],
};

/**
 * Usage charts from Prometheus when it is installed, or else from what metrics-server reported while the app was open
 */
export const UsageMetrics = observer(({ id, tabs, fromPrometheus, fromMetricsServer, fallback = metricsServer }: UsageMetricsProps) => {
  const [tab, setTab] = useState<MetricsTab>(tabs[0]);
  const [range, setRange] = useState(defaultMetricsRange);
  const end = now(15 * 1000);

  if (fromPrometheus) {
    return (
      <MetricsPanel
        id={id}
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        source="Prometheus"
      >
        <UsageChart
          series={fromPrometheus(tab)}
          unit={getUsageUnit(tab)}
          range={prometheusRange}
          end={end}
        />
      </MetricsPanel>
    );
  }

  const unavailableTabs = Object.fromEntries(
    tabs
      .filter(each => !fallback.tabs.includes(each))
      .map(each => [each, `needs Prometheus, ${fallback.source} does not report it`]),
  );
  const shownTab = fallback.tabs.includes(tab) ? tab : fallback.tabs[0];

  return (
    <MetricsPanel
      id={id}
      tabs={tabs}
      tab={shownTab}
      onTabChange={setTab}
      unavailableTabs={unavailableTabs}
      range={range}
      onRangeChange={setRange}
      source={fallback.source}
    >
      <UsageChart
        series={fromMetricsServer(shownTab, { since: end - range, end })}
        unit={getUsageUnit(shownTab)}
        range={range}
        end={end}
      />
    </MetricsPanel>
  );
});
