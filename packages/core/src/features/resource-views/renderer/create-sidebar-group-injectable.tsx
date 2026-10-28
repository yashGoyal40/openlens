/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { getInjectable } from "@ogre-tools/injectable";
import { noop } from "lodash/fp";
import { sidebarItemInjectionToken } from "@k8slens/cluster-sidebar";
import { Icon } from "@k8slens/icon";

export interface SidebarGroupOptions {
  id: string;
  title: string;
  parentId: string | null;
  orderNumber: number;

  /**
   * Material icon name, only shown for top-level groups
   */
  material?: string;

  /**
   * Show a "NEW" badge next to the title
   */
  isNew?: boolean;
}

/**
 * A sidebar item that only groups other items. It is visible while any of its children is visible.
 */
export const createSidebarGroupInjectable = ({ id, title, parentId, orderNumber, material, isNew }: SidebarGroupOptions) => getInjectable({
  id: `sidebar-item-${id}`,

  instantiate: () => ({
    parentId,
    title,
    getIcon: material ? () => <Icon material={material} /> : undefined,
    onClick: noop,
    orderNumber,
    isNew,
  }),

  injectionToken: sidebarItemInjectionToken,
});
