/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import type { ChartOptions } from "chart.js";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import { bytesToUnits } from "@k8slens/utilities";
import type { ChartDataSets } from "../chart";
import { Chart, ChartKind } from "../chart";
import type { LensTheme } from "../../themes/lens-theme";
import activeThemeInjectable from "../../themes/active.injectable";

export type UsageUnit = "cores" | "bytes" | "count" | "seconds";

export interface UsageSeries {
  id: string;
  label: string;
  color: string;
  points: { x: number; y: number }[];

  /**
   * For requests and limits, which are a level rather than a measurement
   */
  dashed?: boolean;
}

export interface UsageChartProps {
  series: UsageSeries[];
  unit: UsageUnit;
  /**
   * The window shown, ending at `end`, in milliseconds
   */
  range: number;
  end: number;
}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

export const formatUsage = (value: number, unit: UsageUnit) => {
  if (value === 0) return "0";

  if (unit === "count") {
    return String(Math.round(value));
  }

  if (unit === "seconds") {
    return `${Number(value.toPrecision(3))}s`;
  }

  if (unit === "bytes") {
    return bytesToUnits(value, { precision: 1 });
  }

  // three significant digits, so that small CPU steps such as 0.0015 stay apart
  if (value < 100) return String(Number(value.toPrecision(3)));

  return value.toFixed(1);
};

const NonInjectedUsageChart = observer(({ activeTheme, series, unit, range, end }: UsageChartProps & Dependencies) => {
  const { textColorSecondary, borderFaintColor } = activeTheme.get().colors;
  const datasets: ChartDataSets[] = series.map(({ id, label, color, points, dashed }) => ({
    id,
    label,
    data: points,
    borderColor: color,
    backgroundColor: color,
    borderWidth: dashed ? 1 : 2,
    borderDash: dashed ? [4, 4] : [],
    fill: false,
    lineTension: 0,
    pointRadius: points.length === 1 ? 2 : 0,
    pointHoverRadius: 3,
    pointHitRadius: 6,
  }));

  const options: ChartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    animation: { duration: 0 },
    layout: { padding: { top: 8 }},
    scales: {
      xAxes: [{
        type: "time",
        gridLines: { display: false },
        time: {
          minUnit: "minute",
          displayFormats: { minute: "HH:mm", hour: "HH:mm" },
          tooltipFormat: "HH:mm:ss",
        },
        ticks: {
          min: end - range,
          max: end,
          fontColor: textColorSecondary,
          fontSize: 11,
          maxRotation: 0,
          autoSkipPadding: 24,
          source: "auto",
        },
      }],
      yAxes: [{
        position: "right",
        gridLines: {
          color: borderFaintColor,
          zeroLineColor: borderFaintColor,
          drawBorder: false,
          tickMarkLength: 0,
        },
        ticks: {
          min: 0,
          maxTicksLimit: 4,
          padding: 8,
          fontColor: textColorSecondary,
          fontSize: 11,
          callback: (value) => formatUsage(Number(value), unit),
        },
      }],
    },
    tooltips: {
      mode: "index",
      intersect: false,
      callbacks: {
        title: ([item]) => String(item?.xLabel ?? ""),
        label: ({ datasetIndex, yLabel }, { datasets = [] }) => (
          `${datasets[datasetIndex ?? 0]?.label}: ${formatUsage(Number(yLabel), unit)}`
        ),
      },
    },
  };

  return (
    <Chart
      className="UsageChart"
      type={ChartKind.LINE}
      data={{ datasets }}
      options={options}
      data-testid="usage-chart"
    />
  );
});

export const UsageChart = withInjectables<Dependencies, UsageChartProps>(NonInjectedUsageChart, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
