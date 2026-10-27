/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export const severityLevels = ["critical", "high", "medium", "low", "unknown"] as const;

export type SeverityLevel = typeof severityLevels[number];

export type SeverityCounts = Record<SeverityLevel, number>;

/**
 * The `summary` field shared by all trivy-operator reports. Audit reports have no `unknownCount`.
 */
export interface SeveritySummary {
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  unknownCount?: number;
  noneCount?: number;
}

export const severityTitles: Record<SeverityLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
};

export const emptySeverityCounts = (): SeverityCounts => ({
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  unknown: 0,
});

/**
 * Trivy reports severities in upper case ("CRITICAL"), anything unrecognised counts as unknown
 */
export const toSeverityLevel = (severity: string | undefined): SeverityLevel => {
  const normalized = severity?.toLowerCase() as SeverityLevel | undefined;

  return normalized && severityLevels.includes(normalized)
    ? normalized
    : "unknown";
};

export const severityRank = (severity: string | undefined) => severityLevels.indexOf(toSeverityLevel(severity));

export const bySeverity = <T extends { severity?: string }>(left: T, right: T) => (
  severityRank(left.severity) - severityRank(right.severity)
);

export const severityCountsFromSummary = (summary: SeveritySummary | undefined): SeverityCounts => ({
  critical: summary?.criticalCount ?? 0,
  high: summary?.highCount ?? 0,
  medium: summary?.mediumCount ?? 0,
  low: summary?.lowCount ?? 0,
  unknown: summary?.unknownCount ?? 0,
});

export const countBySeverity = (items: { severity?: string }[]): SeverityCounts => {
  const counts = emptySeverityCounts();

  for (const item of items) {
    counts[toSeverityLevel(item.severity)] += 1;
  }

  return counts;
};

export const addSeverityCounts = (...all: SeverityCounts[]): SeverityCounts => {
  const sum = emptySeverityCounts();

  for (const counts of all) {
    for (const level of severityLevels) {
      sum[level] += counts[level];
    }
  }

  return sum;
};

export const totalOfSeverityCounts = (counts: SeverityCounts) => (
  severityLevels.reduce((total, level) => total + counts[level], 0)
);

/**
 * Orders the worst first: by critical, then high, then medium, ... counts
 */
export const compareSeverityCounts = (left: SeverityCounts, right: SeverityCounts) => {
  for (const level of severityLevels) {
    if (left[level] !== right[level]) {
      return right[level] - left[level];
    }
  }

  return 0;
};

const maxCountPerLevel = 9_999;

/**
 * A single number ordering counts by critical, then high, then medium, then low, for sortable list columns
 */
export const severitySortWeight = (counts: SeverityCounts) => (
  (["critical", "high", "medium", "low"] as const).reduce(
    (weight, level) => weight * (maxCountPerLevel + 1) + Math.min(counts[level], maxCountPerLevel),
    0,
  )
);
