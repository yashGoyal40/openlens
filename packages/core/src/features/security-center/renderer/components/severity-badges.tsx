/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./security-center.module.scss";

import React from "react";
import type { StatusTone } from "../../../resource-views/renderer/components/status-badge";
import { StatusBadge } from "../../../resource-views/renderer/components/status-badge";
import type { SeverityCounts, SeverityLevel } from "../../common/severity";
import { severityLevels, severityTitles, toSeverityLevel } from "../../common/severity";

export const severityTones: Record<SeverityLevel, StatusTone> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "info",
  unknown: "vague",
};

export const SeverityBadge = ({ severity }: { severity: string | undefined }) => {
  const level = toSeverityLevel(severity);

  return (
    <StatusBadge
      tone={severityTones[level]}
      label={severityTitles[level]}
    />
  );
};

export interface SeverityBadgesProps {
  counts: SeverityCounts;

  /**
   * Only show the first letter of the severity, for list columns
   */
  compact?: boolean;

  /**
   * Shown as a success badge when every count is zero
   */
  emptyLabel?: string;

  /**
   * Used in the tooltips, e.g. "vulnerabilities" or "failed checks"
   */
  noun?: string;
}

export const SeverityBadges = ({ counts, compact = false, emptyLabel = "None", noun }: SeverityBadgesProps) => {
  const levels = severityLevels.filter(level => counts[level] > 0);

  if (levels.length === 0) {
    return (
      <div className={styles.severityBadges}>
        <StatusBadge tone="success" label={emptyLabel} />
      </div>
    );
  }

  return (
    <div className={styles.severityBadges}>
      {levels.map(level => (
        <StatusBadge
          key={level}
          tone={severityTones[level]}
          label={compact
            ? `${severityTitles[level][0]} ${counts[level]}`
            : `${counts[level]} ${severityTitles[level]}`}
          tooltip={[`${severityTitles[level]}: ${counts[level]}`, noun].filter(Boolean).join(" ")}
        />
      ))}
    </div>
  );
};
