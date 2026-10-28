/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./drawer-item-expandable.scss";
import React, { useState } from "react";
import { Icon } from "@k8slens/icon";
import type { StrictReactNode } from "@k8slens/utilities";
import { cssNames } from "@k8slens/utilities";
import { DrawerItem } from "./drawer-item";

export interface DrawerItemExpandableProps {
  name: StrictReactNode;

  /**
   * Shown while collapsed, such as "6 Labels"
   */
  summary: StrictReactNode;
  children: StrictReactNode;
  className?: string;
  labelsOnly?: boolean;

  /**
   * When expanded, the contents use the whole width below the name
   */
  fullWidth?: boolean;
  "data-testid"?: string;
}

/**
 * A row that only shows a summary until it is expanded
 */
export function DrawerItemExpandable({ name, summary, children, className, labelsOnly, fullWidth, "data-testid": testId }: DrawerItemExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded(!expanded);

  return (
    <DrawerItem
      className={cssNames("DrawerItemExpandable", className, { expanded, fullWidth })}
      labelsOnly={expanded && labelsOnly}
      data-testid={testId}
      name={(
        <span
          className="toggle"
          role="button"
          aria-expanded={expanded}
          onClick={toggle}
          data-testid={testId && `${testId}-toggle`}
        >
          {name}
          <Icon material={expanded ? "unfold_less" : "unfold_more"} small />
        </span>
      )}
    >
      {expanded
        ? children
        : (
          <span className="summary" onClick={toggle}>
            {summary}
          </span>
        )}
    </DrawerItem>
  );
}
