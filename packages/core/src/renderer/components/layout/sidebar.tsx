/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./sidebar.module.scss";

import React, { useState } from "react";
import { observer } from "mobx-react";
import { cssNames } from "@k8slens/utilities";
import { Icon } from "@k8slens/icon";
import { SidebarItem } from "./sidebar-item";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import { SidebarCluster } from "./sidebar-cluster";
import { ClusterSwitcher } from "./cluster-switcher";
import { SidebarFilterContext, itemMatches } from "./sidebar-filter";
import { SearchInput } from "../input";
import { getEntityColor } from "../cluster-glyph";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { SidebarItemDeclaration } from "@k8slens/cluster-sidebar";
import { sidebarItemsInjectable } from "@k8slens/cluster-sidebar";
import type { IComputedValue } from "mobx";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";

interface Dependencies {
  sidebarItems: IComputedValue<SidebarItemDeclaration[]>;
  entityRegistry: CatalogEntityRegistry;
}

const NonInjectedSidebar = observer(({
  sidebarItems,
  entityRegistry,
}: Dependencies) => {
  const [isFiltering, setIsFiltering] = useState(false);
  const [filter, setFilter] = useState("");
  const clusterEntity = entityRegistry.activeEntity;
  const query = isFiltering ? filter.trim().toLowerCase() : "";
  const items = sidebarItems.get();
  const hasMatches = !query || items.some(item => itemMatches(item, query));

  const stopFiltering = () => {
    setIsFiltering(false);
    setFilter("");
  };

  return (
    <div className={cssNames("flex flex-col", styles.sidebar)} data-testid="cluster-sidebar">
      <div className={styles.header}>
        <span className={styles.headerTab}>Navigator</span>
      </div>
      <div className={styles.toolbar}>
        <ClusterSwitcher />
        <Icon
          material="search"
          className={cssNames(styles.searchToggle, { [styles.searchActive]: isFiltering })}
          tooltip="Filter navigator"
          onClick={() => (isFiltering ? stopFiltering() : setIsFiltering(true))}
          data-testid="navigator-filter-toggle"
        />
      </div>
      {isFiltering && (
        <div className={styles.filter}>
          <SearchInput
            value={filter}
            onChange={setFilter}
            onClear={stopFiltering}
            placeholder="Filter navigator..."
            bindGlobalFocusHotkey={false}
            data-testid="navigator-filter-input"
          />
        </div>
      )}

      <SidebarCluster clusterEntity={clusterEntity} />

      <div className={`${styles.sidebarNav} sidebar-active-status`}>
        <div
          className={styles.tree}
          style={{ "--cluster-accent": clusterEntity ? getEntityColor(clusterEntity) : undefined } as React.CSSProperties}
        >
          <SidebarFilterContext.Provider value={query}>
            {items.map(hierarchicalSidebarItem => (
              <SidebarItem
                item={hierarchicalSidebarItem}
                key={hierarchicalSidebarItem.id}
              />
            ))}
          </SidebarFilterContext.Provider>
        </div>
        {!hasMatches && (
          <div className={styles.noMatches} data-testid="navigator-no-matches">
            {`No matches for "${filter.trim()}"`}
          </div>
        )}
      </div>
    </div>
  );
});

export const Sidebar = withInjectables<Dependencies>(NonInjectedSidebar, {
  getProps: (di, props) => ({
    ...props,
    sidebarItems: di.inject(sidebarItemsInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
  }),
});

Sidebar.displayName = "Sidebar";
