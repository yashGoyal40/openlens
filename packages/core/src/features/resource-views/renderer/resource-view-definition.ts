/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type React from "react";
import type { KubeObject, KubeObjectConstructor } from "@k8slens/kube-object";
import type { StrictReactNode, SingleOrMany } from "@k8slens/utilities";
import type { ResourceDescriptor } from "../common/resource-descriptor";
import type { ResourceRouteInjectables } from "../common/create-resource-route-injectables";
import type { ResourceCondition } from "./components/resource-conditions";

export type ResourceColumnSize = "narrow" | "normal" | "wide";

export interface ResourceColumn<Obj extends KubeObject> {
  id: string;
  title: string;
  value: (object: Obj) => StrictReactNode;
  sortBy?: (object: Obj) => string | number | undefined;
  search?: (object: Obj) => SingleOrMany<string | number | undefined | null>;
  size?: ResourceColumnSize;
}

export interface ResourceDetail<Obj extends KubeObject> {
  name: string;
  value: (object: Obj) => StrictReactNode;
  hidden?: (object: Obj) => boolean;
}

export interface ResourceViewDefinition<Obj extends KubeObject> {
  descriptor: ResourceDescriptor;
  objectConstructor: KubeObjectConstructor<Obj, any>;
  routes: ResourceRouteInjectables;
  sidebar: {
    parentId: string;
    orderNumber: number;
  };
  columns: ResourceColumn<Obj>[];
  details?: ResourceDetail<Obj>[];

  /**
   * Rendered in the details drawer below `details`
   */
  DetailsComponent?: React.ComponentType<{ object: Obj }>;

  /**
   * Defaults to `object.status.conditions` when that is an array
   */
  getConditions?: (object: Obj) => ResourceCondition[] | undefined;

  /**
   * Condition types that are healthy when "False", defaults to `defaultNegativePolarityTypes`
   */
  negativePolarityTypes?: string[];
}

/**
 * Identity helper giving `columns`, `details`, etc. the precise object type
 */
export const defineResourceView = <Obj extends KubeObject>(definition: ResourceViewDefinition<Obj>) => definition;
