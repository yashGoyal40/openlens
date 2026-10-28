/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from  "./sidebar-items.module.scss";

import React, { useContext } from "react";
import { observer } from "mobx-react";
import { NavLink } from "react-router-dom";
import { Icon } from "@k8slens/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { SidebarStorageState } from "./sidebar-storage/sidebar-storage.injectable";
import sidebarStorageInjectable from "./sidebar-storage/sidebar-storage.injectable";
import type { SidebarItemDeclaration } from "@k8slens/cluster-sidebar";
import type { StorageLayer } from "../../utils/storage-helper";
import { SidebarFilterContext, itemMatches, titleMatches } from "./sidebar-filter";

interface Dependencies {
  sidebarStorage: StorageLayer<SidebarStorageState>;
}

export interface SidebarItemProps {
  item: SidebarItemDeclaration;
}

const NonInjectedSidebarItem = observer((props: SidebarItemProps & Dependencies) => {
  const { item, sidebarStorage } = props;
  const query = useContext(SidebarFilterContext);
  const id = item.id;
  // while filtering every matching branch is shown expanded
  const expanded = query ? true : (sidebarStorage.get().expanded[id] ?? false);
  const isExpandable = item.children.length > 0 && item.children.some(item => item.isVisible.get());
  const isActive = item.isActive.get();

  const toggleExpand = () => {
    sidebarStorage.merge((draft) => {
      draft.expanded[id] = !draft.expanded[id];
    });
  };
  const renderSubMenu = () => {
    if (!isExpandable || !expanded) {
      return null;
    }

    const children = item.children.map((child) => (
      <SidebarItem key={child.id} item={child} />
    ));

    return (
      <div className={styles.subMenu}>
        {query && titleMatches(item, query)
          // all children of a matching group are shown
          ? <SidebarFilterContext.Provider value="">{children}</SidebarFilterContext.Provider>
          : children}
      </div>
    );
  };

  if (!item.isVisible.get() || (query && !itemMatches(item, query))) {
    return null;
  }

  return (
    <div
      className={styles.SidebarItem}
      data-testid={id}
      data-is-active-test={isActive}
      data-parent-id-test={item.parentId}
    >
      <NavLink
        to={""}
        isActive={() => isActive}
        className={isExpandable ? `${styles.navItem} ${styles.expandable}` : styles.navItem}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (isExpandable) {
            toggleExpand();
          } else {
            item.onClick();
          }
        }}
        data-testid={`link-for-${id}`}
      >
        {isExpandable
          ? (
            <Icon
              className={styles.expandIcon}
              material={expanded ? "keyboard_arrow_down" : "keyboard_arrow_right"}
              data-testid={`expand-icon-for-${id}`}
            />
          )
          : <span className={styles.expandIconPlaceholder} />}
        {item.getIcon?.()}
        <span className={styles.title}>{item.title}</span>
        {item.isNew && (
          <span className={styles.newBadge} data-testid={`new-badge-for-${id}`}>NEW</span>
        )}
      </NavLink>
      {renderSubMenu()}
    </div>
  );
});

export const SidebarItem = withInjectables<Dependencies, SidebarItemProps>(NonInjectedSidebarItem, {
  getProps: (di, props) => ({
    ...props,
    sidebarStorage: di.inject(sidebarStorageInjectable),
  }),
});

SidebarItem.displayName = "SidebarItem";
