/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import type { SidebarItemDeclaration } from "@k8slens/cluster-sidebar";

/**
 * The lower-cased text the navigator is filtered by, empty when not filtering
 */
export const SidebarFilterContext = React.createContext("");

export const titleMatches = (item: SidebarItemDeclaration, query: string): boolean => (
  typeof item.title === "string" && item.title.toLowerCase().includes(query)
);

export const itemMatches = (item: SidebarItemDeclaration, query: string): boolean => (
  item.isVisible.get()
  && (titleMatches(item, query) || item.children.some(child => itemMatches(child, query)))
);
