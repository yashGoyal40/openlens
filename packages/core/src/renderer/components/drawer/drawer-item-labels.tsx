/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import type { DrawerItemProps } from "./drawer-item";
import { DrawerItem } from "./drawer-item";
import { DrawerItemExpandable } from "./drawer-item-expandable";
import { Badge } from "../badge";
import { KubeObject } from "@k8slens/kube-object";

export interface DrawerItemLabelsProps extends DrawerItemProps {
  labels: string[] | Partial<Record<string, string>>;

  /**
   * Shows a count until expanded, when there is more than one
   */
  collapsible?: boolean;
}

export function DrawerItemLabels(props: DrawerItemLabelsProps) {
  const { labels, collapsible, ...itemProps } = props;

  if (!labels || typeof labels !== "object") {
    return null;
  }

  const labelStrings = Array.isArray(labels)
    ? labels
    : KubeObject.stringifyLabels(labels);

  if (labelStrings.length === 0) {
    return null;
  }

  const badges = labelStrings.map(label => (
    <Badge
      key={label}
      label={label}
      title={label}
    />
  ));

  if (collapsible && labelStrings.length > 1 && !itemProps.hidden) {
    return (
      <DrawerItemExpandable
        name={itemProps.name}
        summary={`${labelStrings.length} ${typeof itemProps.name === "string" ? itemProps.name : "items"}`}
        className={itemProps.className}
        labelsOnly
      >
        {badges}
      </DrawerItemExpandable>
    );
  }

  return (
    <DrawerItem {...itemProps} labelsOnly>
      {badges}
    </DrawerItem>
  );
}
