/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./resource-views.module.scss";

import React from "react";
import { DrawerItem } from "../../../../renderer/components/drawer";
import { StatusBadge } from "./status-badge";
import type { KubeCondition } from "../../common/kube-condition";

export type ResourceCondition = KubeCondition;

export interface ConditionBadgesProps {
  conditions: ResourceCondition[] | undefined;

  /**
   * Some conditions (e.g. "Degraded", "Stalled") are healthy when false
   */
  negativePolarityTypes?: string[];
}

export interface ResourceConditionsProps extends ConditionBadgesProps {
  title?: string;
}

const conditionTooltip = (condition: ResourceCondition) => [
  `${condition.type}: ${condition.status}`,
  condition.reason && `Reason: ${condition.reason}`,
  condition.message,
  condition.lastTransitionTime && `Last transition: ${condition.lastTransitionTime}`,
].filter(Boolean).join("\n");

export const defaultNegativePolarityTypes = ["Degraded", "Stalled", "Reconciling", "Conflicted", "Failed"];

export const ConditionBadges = ({ conditions, negativePolarityTypes = defaultNegativePolarityTypes }: ConditionBadgesProps) => (
  <div className={styles.conditions}>
    {conditions?.map(condition => {
      const isNegative = negativePolarityTypes.includes(condition.type);
      const isHealthy = isNegative
        ? condition.status === "False"
        : condition.status === "True";

      return (
        <StatusBadge
          key={condition.type}
          tone={condition.status === "Unknown" ? "warning" : isHealthy ? "success" : "error"}
          label={condition.type}
          tooltip={conditionTooltip(condition)}
        />
      );
    })}
  </div>
);

export const ResourceConditions = ({ conditions, title = "Conditions", negativePolarityTypes }: ResourceConditionsProps) => {
  if (!conditions?.length) {
    return null;
  }

  return (
    <DrawerItem name={title} labelsOnly>
      <ConditionBadges conditions={conditions} negativePolarityTypes={negativePolarityTypes} />
    </DrawerItem>
  );
};

/**
 * Picks the first condition of the preferred types, e.g. for a "Status" list column
 */
export const getPrimaryCondition = (conditions: ResourceCondition[] | undefined, preferredTypes: string[]) => {
  for (const type of preferredTypes) {
    const condition = conditions?.find(condition => condition.type === type);

    if (condition) {
      return condition;
    }
  }

  return undefined;
};
