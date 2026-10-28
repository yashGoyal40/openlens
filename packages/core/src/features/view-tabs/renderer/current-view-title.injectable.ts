/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { SidebarItemDeclaration } from "@k8slens/cluster-sidebar";
import { sidebarItemsInjectable } from "@k8slens/cluster-sidebar";

const findActiveTrail = (items: SidebarItemDeclaration[]): SidebarItemDeclaration[] => {
  const active = items.find(item => item.isActive.get());

  if (!active) {
    return [];
  }

  return [active, ...findActiveTrail(active.children)];
};

const titleFromPath = (pathname: string) => {
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  const words = last.replace(/[-_]+/g, " ").trim();

  return words
    ? words[0].toUpperCase() + words.slice(1)
    : "Overview";
};

export type GetCurrentViewTitle = (pathname: string) => string;

/**
 * The title of the open view, taken from the active navigator item
 */
const getCurrentViewTitleInjectable = getInjectable({
  id: "get-current-view-title",

  instantiate: (di): GetCurrentViewTitle => {
    const sidebarItems = di.inject(sidebarItemsInjectable);

    return (pathname) => {
      const trail = findActiveTrail(sidebarItems.get());
      const leaf = trail[trail.length - 1];
      const parent = trail[trail.length - 2];

      if (!leaf || typeof leaf.title !== "string") {
        return titleFromPath(pathname);
      }

      // eg. "Workloads Overview" instead of a second "Overview"
      if (parent && typeof parent.title === "string" && leaf.title === "Overview") {
        return `${parent.title} ${leaf.title}`;
      }

      return leaf.title;
    };
  },
});

export default getCurrentViewTitleInjectable;
