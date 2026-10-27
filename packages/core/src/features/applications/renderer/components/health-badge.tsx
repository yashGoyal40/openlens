/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { StatusTone } from "../../../resource-views/renderer/components/status-badge";
import { StatusBadge } from "../../../resource-views/renderer/components/status-badge";
import type { ApplicationHealth } from "../workload-status";

const toneForHealth: Record<ApplicationHealth, StatusTone> = {
  Healthy: "success",
  Progressing: "warning",
  Degraded: "error",
};

export interface HealthBadgeProps {
  health: ApplicationHealth;
  tooltip?: string;
}

export const HealthBadge = ({ health, tooltip }: HealthBadgeProps) => (
  <StatusBadge
    tone={toneForHealth[health]}
    label={health}
    tooltip={tooltip}
  />
);
