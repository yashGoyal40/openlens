/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./view-tabs.module.scss";

import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import { cssNames } from "@k8slens/utilities";
import { Icon } from "@k8slens/icon";
import { Menu, MenuItem } from "../../../renderer/components/menu";
import { ClusterGlyph, getEntityColor } from "../../../renderer/components/cluster-glyph";
import type { CatalogEntityRegistry } from "../../../renderer/api/catalog/entity/registry";
import catalogEntityRegistryInjectable from "../../../renderer/api/catalog/entity/registry.injectable";
import type { ViewTabsModel } from "./view-tabs-model.injectable";
import viewTabsModelInjectable from "./view-tabs-model.injectable";
import type { ViewTab } from "./view-tabs-state";

interface Dependencies {
  model: ViewTabsModel;
  entityRegistry: CatalogEntityRegistry;
}

interface ViewTabItemProps {
  tab: ViewTab;
  active: boolean;
  clusterName?: string;
  clusterColor?: string;
  model: ViewTabsModel;
}

const ViewTabItem = ({ tab, active, clusterName, clusterColor, model }: ViewTabItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const id = `view-tab-${tab.id}`;
  const label = clusterName ? `${tab.title} - ${clusterName}` : tab.title;

  return (
    <div
      id={id}
      role="tab"
      aria-selected={active}
      className={cssNames(styles.tab, { [styles.active]: active, [styles.preview]: tab.preview })}
      style={{ "--tab-accent": clusterColor } as React.CSSProperties}
      title={label}
      onClick={() => !active && model.activate(tab)}
      onDoubleClick={() => model.keepOpen(tab)}
      onMouseUp={(event) => event.button === 1 && model.close(tab)}
      data-testid={id}
      data-is-active-test={active}
      data-is-preview-test={tab.preview}
    >
      {clusterColor && <ClusterGlyph color={clusterColor} size={14} />}
      <span className={styles.title}>{label}</span>
      <Icon
        material="close"
        className={styles.close}
        onClick={(event) => {
          event.stopPropagation();
          model.close(tab);
        }}
        data-testid={`close-${id}`}
      />
      <Menu
        usePortal
        htmlFor={id}
        isOpen={menuOpen}
        toggleEvent="contextmenu"
        open={() => setMenuOpen(true)}
        close={() => setMenuOpen(false)}
      >
        {tab.preview && <MenuItem onClick={() => model.keepOpen(tab)}>Keep Open</MenuItem>}
        <MenuItem onClick={() => model.close(tab)}>Close</MenuItem>
        <MenuItem onClick={() => model.closeOthers(tab)}>Close Others</MenuItem>
      </Menu>
    </div>
  );
};

const NonInjectedViewTabs = observer(({ model, entityRegistry }: Dependencies) => {
  useEffect(() => model.track(), [model]);

  const cluster = entityRegistry.activeEntity;
  const clusterColor = cluster && getEntityColor(cluster);

  return (
    <div
      className={styles.ViewTabs}
      role="tablist"
      data-testid="view-tabs">
      {model.tabs.map(tab => (
        <ViewTabItem
          key={tab.id}
          tab={tab}
          active={tab.id === model.activeTabId}
          clusterName={cluster?.getName()}
          clusterColor={clusterColor}
          model={model}
        />
      ))}
    </div>
  );
});

export const ViewTabs = withInjectables<Dependencies>(NonInjectedViewTabs, {
  getProps: (di, props) => ({
    ...props,
    model: di.inject(viewTabsModelInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
  }),
});
