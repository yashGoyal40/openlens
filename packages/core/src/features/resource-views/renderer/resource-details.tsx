/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { observer } from "mobx-react";
import type { KubeObject } from "@k8slens/kube-object";
import { DrawerItem } from "../../../renderer/components/drawer";
import type { ResourceViewDefinition } from "./resource-view-definition";
import type { ResourceCondition } from "./components/resource-conditions";
import { ResourceConditions } from "./components/resource-conditions";

export interface ResourceDetailsProps {
  definition: ResourceViewDefinition<KubeObject>;
  object: KubeObject;
}

const getDefaultConditions = (object: KubeObject): ResourceCondition[] | undefined => {
  const status = object.status as { conditions?: unknown } | undefined;

  return Array.isArray(status?.conditions)
    ? status?.conditions as ResourceCondition[]
    : undefined;
};

export const ResourceDetails = observer(({ definition, object }: ResourceDetailsProps) => {
  const { details = [], DetailsComponent, getConditions = getDefaultConditions, negativePolarityTypes } = definition;

  return (
    <div className={`ResourceDetails ${definition.descriptor.id}-details`}>
      {details.map(detail => (
        <DrawerItem
          key={detail.name}
          name={detail.name}
          hidden={detail.hidden?.(object) ?? false}
        >
          {detail.value(object)}
        </DrawerItem>
      ))}
      <ResourceConditions conditions={getConditions(object)} negativePolarityTypes={negativePolarityTypes} />
      {DetailsComponent && <DetailsComponent object={object} />}
    </div>
  );
});
