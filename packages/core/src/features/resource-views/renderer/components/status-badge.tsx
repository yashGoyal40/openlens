/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./resource-views.module.scss";

import React from "react";
import type { StrictReactNode } from "@k8slens/utilities";
import { cssNames } from "@k8slens/utilities";
import { Badge } from "../../../../renderer/components/badge";

export type StatusTone = "success" | "warning" | "error" | "info" | "vague";

export interface StatusBadgeProps {
  tone: StatusTone;
  label: StrictReactNode;
  tooltip?: string;
  small?: boolean;
}

export const StatusBadge = ({ tone, label, tooltip, small = true }: StatusBadgeProps) => (
  <Badge
    small={small}
    label={label}
    title={tooltip}
    className={cssNames(styles.statusBadge, styles[tone])}
  />
);

const successStatuses = new Set(["true", "ready", "healthy", "synced", "accepted", "programmed", "resolvedrefs", "succeeded", "available", "allocated", "running"]);
const warningStatuses = new Set(["unknown", "progressing", "pending", "outofsync", "suspended", "degraded"]);
const errorStatuses = new Set(["false", "failed", "missing", "error", "invalid"]);

/**
 * Picks a tone for the common status words used by controllers, defaulting to "vague"
 */
export const toneForStatus = (status: string | undefined): StatusTone => {
  const normalized = status?.toLowerCase().replace(/[\s_-]/g, "") ?? "";

  if (successStatuses.has(normalized)) {
    return "success";
  }

  if (warningStatuses.has(normalized)) {
    return "warning";
  }

  if (errorStatuses.has(normalized)) {
    return "error";
  }

  return "vague";
};
