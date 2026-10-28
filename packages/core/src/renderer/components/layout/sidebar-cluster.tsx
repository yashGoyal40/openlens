/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./sidebar-cluster.module.scss";
import { observable } from "mobx";
import React, { useState } from "react";
import { broadcastMessage } from "../../../common/ipc";
import type { CatalogEntity, CatalogEntityContextMenu } from "../../api/catalog-entity";
import { IpcRendererNavigationEvents } from "../../../common/ipc/navigation-events";
import { ClusterGlyph, getEntityColor } from "../cluster-glyph";
import { LensKubernetesClusterStatus } from "../../../common/catalog-entities/kubernetes-cluster";
import { Icon } from "@k8slens/icon";
import { Menu, MenuItem } from "../menu";
import { Tooltip } from "@k8slens/tooltip";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import type { VisitEntityContextMenu } from "../../../common/catalog/visit-entity-context-menu.injectable";
import visitEntityContextMenuInjectable from "../../../common/catalog/visit-entity-context-menu.injectable";
import type { Navigate } from "../../navigation/navigate.injectable";
import type { NormalizeCatalogEntityContextMenu } from "../../catalog/normalize-menu-item.injectable";
import navigateInjectable from "../../navigation/navigate.injectable";
import normalizeCatalogEntityContextMenuInjectable from "../../catalog/normalize-menu-item.injectable";
import type { ActiveHotbarModel } from "../../../features/hotbar/storage/common/toggling.injectable";
import activeHotbarInjectable from "../../../features/hotbar/storage/common/toggling.injectable";

export interface SidebarClusterProps {
  clusterEntity: CatalogEntity | null | undefined;
}

interface Dependencies {
  navigate: Navigate;
  normalizeMenuItem: NormalizeCatalogEntityContextMenu;
  visitEntityContextMenu: VisitEntityContextMenu;
  entityInActiveHotbar: ActiveHotbarModel;
}

const NonInjectedSidebarCluster = observer(({
  clusterEntity,
  visitEntityContextMenu: onContextMenuOpen,
  navigate,
  normalizeMenuItem,
  entityInActiveHotbar,
}: Dependencies & SidebarClusterProps) => {
  const [menuItems] = useState(observable.array<CatalogEntityContextMenu>());
  const [opened, setOpened] = useState(false );

  if (!clusterEntity) {
    // render a Loading version of the SidebarCluster
    return (
      <div className={styles.SidebarCluster}>
        <ClusterGlyph color="var(--halfGray)" className={styles.loadingAvatar} />
        <div className={styles.loadingClusterName} />
      </div>
    );
  }

  const onMenuOpen = () => {
    const title = entityInActiveHotbar.hasEntity(clusterEntity.getId())
      ? "Remove from Hotbar"
      : "Add to Hotbar";
    const onClick = () => entityInActiveHotbar.toggleEntity(clusterEntity);

    menuItems.replace([{ title, onClick }]);
    onContextMenuOpen(clusterEntity, {
      menuItems,
      navigate: (url, forceMainFrame = true) => {
        if (forceMainFrame) {
          broadcastMessage(IpcRendererNavigationEvents.NAVIGATE_IN_APP, url);
        } else {
          navigate(url);
        }
      },
    });

    toggle();
  };

  const onKeyDown = (evt: React.KeyboardEvent<HTMLDivElement>) => {
    if (evt.code == "Space") {
      toggle();
    }
  };

  const toggle = () => {
    setOpened(!opened);
  };

  const id = `cluster-${clusterEntity.getId()}`;
  const tooltipId = `tooltip-${id}`;

  return (
    <div
      id={id}
      className={styles.SidebarCluster}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="menubar"
      data-testid="sidebar-cluster-dropdown"
    >
      <Icon material="expand_more" className={styles.expand} />
      {clusterEntity.spec.icon?.src
        ? (
          <img
            src={clusterEntity.spec.icon.src}
            alt=""
            className={styles.avatar} />
        )
        : <ClusterGlyph color={getEntityColor(clusterEntity)} className={styles.avatar} />}
      <div className={styles.clusterName} id={tooltipId}>
        {clusterEntity.getName()}
      </div>
      <Tooltip targetId={tooltipId}>
        {clusterEntity.getName()}
      </Tooltip>
      {clusterEntity.status.phase === LensKubernetesClusterStatus.CONNECTED && (
        <span
          className={styles.connected}
          title="Connected"
          data-testid="sidebar-cluster-connected" />
      )}
      <Icon material="more_vert" className={styles.dropdown} />
      <Menu
        usePortal
        htmlFor={id}
        isOpen={opened}
        open={onMenuOpen}
        closeOnClickItem
        closeOnClickOutside
        close={toggle}
        className={styles.menu}
      >
        {
          menuItems
            .map(normalizeMenuItem)
            .map((menuItem) => (
              <MenuItem key={menuItem.title} onClick={menuItem.onClick}>
                {menuItem.title}
              </MenuItem>
            ))
        }
      </Menu>
    </div>
  );
});

export const SidebarCluster = withInjectables<Dependencies, SidebarClusterProps>(NonInjectedSidebarCluster, {
  getProps: (di, props) => ({
    ...props,
    visitEntityContextMenu: di.inject(visitEntityContextMenuInjectable),
    navigate: di.inject(navigateInjectable),
    normalizeMenuItem: di.inject(normalizeCatalogEntityContextMenuInjectable),
    entityInActiveHotbar: di.inject(activeHotbarInjectable),
  }),
});
