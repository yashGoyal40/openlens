/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import "./resource-list.scss";

import React from "react";
import { observer } from "mobx-react";
import type { KubeObject } from "@k8slens/kube-object";
import type { TableCellProps } from "@k8slens/list-layout";
import { cssNames } from "@k8slens/utilities";
import type { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import { KubeObjectListLayout } from "../../../renderer/components/kube-object-list-layout";
import { KubeObjectStatusIcon } from "../../../renderer/components/kube-object-status-icon";
import { KubeObjectAge } from "../../../renderer/components/kube-object/age";
import { SiblingsInTabLayout } from "../../../renderer/components/layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../../../renderer/components/namespaces/namespace-select-badge";
import type { ResourceColumn, ResourceViewDefinition } from "./resource-view-definition";

export interface ResourceListProps {
  definition: ResourceViewDefinition<KubeObject>;
  store: KubeObjectStore<KubeObject>;
}

const columnClassName = (column: ResourceColumn<KubeObject>) => cssNames(column.id, column.size);

export const ResourceList = observer(({ definition, store }: ResourceListProps) => {
  const { descriptor, columns } = definition;
  const sortingCallbacks: Record<string, (object: KubeObject) => string | number | undefined> = {
    name: object => object.getName(),
    namespace: object => object.getNs(),
    age: object => -object.getCreationTimestamp(),
  };

  for (const column of columns) {
    if (column.sortBy) {
      sortingCallbacks[column.id] = column.sortBy;
    }
  }

  const header: TableCellProps[] = [
    { title: "Name", className: "name", sortBy: "name", id: "name" },
    { className: "warning", showWithColumn: "name" },
    ...(descriptor.namespaced
      ? [{ title: "Namespace", className: "namespace", sortBy: "namespace", id: "namespace" }]
      : []),
    ...columns.map(column => ({
      title: column.title,
      className: columnClassName(column),
      sortBy: column.sortBy ? column.id : undefined,
      id: column.id,
    })),
    { title: "Age", className: "age", sortBy: "age", id: "age" },
  ];

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId={descriptor.id}
        className={cssNames("ResourceList", descriptor.id)}
        store={store}
        resourceName={descriptor.title}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[
          object => object.getSearchFields(),
          ...columns.flatMap(column => column.search ? [column.search] : []),
        ]}
        renderHeaderTitle={descriptor.title}
        renderTableHeader={header}
        renderTableContents={object => [
          object.getName(),
          <KubeObjectStatusIcon key="icon" object={object} />,
          ...(descriptor.namespaced
            ? [<NamespaceSelectBadge key="namespace" namespace={object.getNs() ?? ""} />]
            : []),
          ...columns.map(column => column.value(object)),
          <KubeObjectAge key="age" object={object} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});
