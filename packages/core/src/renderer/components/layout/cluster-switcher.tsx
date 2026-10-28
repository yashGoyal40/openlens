/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./sidebar.module.scss";

import React from "react";
import { observer } from "mobx-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import { Icon } from "@k8slens/icon";
import { Select } from "../select";
import { ClusterGlyph, getEntityColor } from "../cluster-glyph";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import { isKubernetesCluster } from "../../../common/catalog-entities";
import type { KubernetesCluster } from "../../../common/catalog-entities";
import { broadcastMessage } from "../../../common/ipc";
import { IpcRendererNavigationEvents } from "../../../common/ipc/navigation-events";

const catalogOption = "catalog";

interface SwitcherOption {
  value: string;
  label: string;
  cluster?: KubernetesCluster;
}

interface Dependencies {
  entityRegistry: CatalogEntityRegistry;
}

const NonInjectedClusterSwitcher = observer(({ entityRegistry }: Dependencies) => {
  const clusters = entityRegistry.items.get()
    .filter(isKubernetesCluster)
    .sort((left, right) => left.getName().localeCompare(right.getName()));
  const options: SwitcherOption[] = [
    ...clusters.map(cluster => ({ value: cluster.getId(), label: cluster.getName(), cluster })),
    { value: catalogOption, label: "Catalog" },
  ];

  const onChange = (option: SwitcherOption | null) => {
    if (!option || option.value === entityRegistry.activeEntity?.getId()) {
      return;
    }

    // clusters are opened by the root frame
    broadcastMessage(
      IpcRendererNavigationEvents.NAVIGATE_IN_APP,
      option.value === catalogOption ? "/catalog" : `/cluster/${option.value}`,
    );
  };

  return (
    <Select<string, SwitcherOption, false>
      id="navigator-cluster-switcher"
      className={styles.switcher}
      menuClass={styles.switcherMenu}
      options={options}
      value={entityRegistry.activeEntity?.getId()}
      onChange={onChange}
      formatOptionLabel={(option, { context }) => (
        <div className={styles.switcherOption}>
          {context === "menu" && (
            option.cluster
              ? <ClusterGlyph color={getEntityColor(option.cluster)} size={14} />
              : <Icon material="view_list" small />
          )}
          <span>{option.label}</span>
        </div>
      )}
      isSearchable
      aria-label="Switch cluster"
    />
  );
});

export const ClusterSwitcher = withInjectables<Dependencies>(NonInjectedClusterSwitcher, {
  getProps: (di, props) => ({
    ...props,
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
  }),
});
