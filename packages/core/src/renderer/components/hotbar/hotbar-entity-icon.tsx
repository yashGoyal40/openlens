/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./hotbar-entity-icon.module.scss";

import React from "react";
import type { IComputedValue } from "mobx";
import { observable } from "mobx";
import { observer } from "mobx-react";

import type { CatalogEntity, CatalogEntityContextMenu } from "../../../common/catalog";
import type { IClassName } from "@k8slens/utilities";
import { cssNames } from "@k8slens/utilities";
import { Icon } from "@k8slens/icon";
import { HotbarIcon } from "./hotbar-icon";
import { LensKubernetesClusterStatus } from "../../../common/catalog-entities/kubernetes-cluster";
import type { VisitEntityContextMenu } from "../../../common/catalog/visit-entity-context-menu.injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import { getIconMaterial, getShortName } from "../../../common/catalog/helpers";
import { ClusterGlyph, getEntityColor } from "../cluster-glyph";
import visitEntityContextMenuInjectable from "../../../common/catalog/visit-entity-context-menu.injectable";
import activeEntityInjectable from "../../api/catalog/entity/active.injectable";
import type { Navigate } from "../../navigation/navigate.injectable";
import navigateInjectable from "../../navigation/navigate.injectable";

export interface HotbarEntityIconProps {
  entity: CatalogEntity;
  index: number;
  errorClass?: IClassName;
  add: (item: CatalogEntity, index: number) => void;
  remove: (uid: string) => void;
  size?: number;
  onClick?: () => void;
  className?: string;
}

interface Dependencies {
  visitEntityContextMenu: VisitEntityContextMenu;
  activeEntity: IComputedValue<CatalogEntity | undefined>;
  navigate: Navigate;
}

@observer
class NonInjectedHotbarEntityIcon extends React.Component<HotbarEntityIconProps & Dependencies> {
  private readonly menuItems = observable.array<CatalogEntityContextMenu>();

  private renderLedIcon() {
    const { entity } = this.props;

    // TODO: make it more generic
    if (entity.kind !== "KubernetesCluster" || entity.status.phase !== LensKubernetesClusterStatus.CONNECTED) {
      return null;
    }

    return <div className={cssNames(styles.led, styles.online)} data-testid={`hotbar-connected-${entity.getId()}`} />;
  }

  /**
   * Lens style tile: the cluster heptagon in the cluster colour with the short name below it,
   * or the material icon of other entities drawn in their colour
   */
  private renderTile() {
    const { entity } = this.props;
    const color = getEntityColor(entity);
    const material = getIconMaterial(entity);

    if (entity.kind === "KubernetesCluster" || !material) {
      return (
        <span className={styles.tile}>
          <ClusterGlyph
            color={color}
            size={28}
            className={styles.glyph} />
          <span className={styles.label}>{getShortName(entity)}</span>
        </span>
      );
    }

    return (
      <span className={styles.tile}>
        <Icon
          material={material}
          className={styles.material}
          style={{ color }} />
      </span>
    );
  }

  isActive(item: CatalogEntity) {
    return this.props.activeEntity.get()?.metadata?.uid == item.getId();
  }

  onMenuOpen() {
    this.menuItems.replace([{
      title: "Remove from Hotbar",
      onClick: () => this.props.remove(this.props.entity.getId()),
    }]);

    this.props.visitEntityContextMenu(this.props.entity, {
      menuItems: this.menuItems,
      navigate: this.props.navigate,
    });
  }

  render() {
    const { entity, className, onClick } = this.props;
    const src = entity.spec.icon?.src;

    return (
      <HotbarIcon
        uid={entity.getId()}
        title={entity.getName()}
        source={entity.metadata.source}
        src={src}
        background={src ? undefined : "var(--clusterMenuCellBackground)"}
        content={src ? undefined : this.renderTile()}
        className={className}
        active={this.isActive(entity)}
        onMenuOpen={() => this.onMenuOpen()}
        disabled={!entity}
        menuItems={this.menuItems}
        tooltip={(
          entity.metadata.source
            ? `${entity.getName()} (${entity.metadata.source})`
            : entity.getName()
        )}
        onClick={onClick}
      >
        {this.renderLedIcon()}
      </HotbarIcon>
    );
  }
}

export const HotbarEntityIcon = withInjectables<Dependencies, HotbarEntityIconProps>(NonInjectedHotbarEntityIcon, {
  getProps: (di, props) => ({
    ...props,
    visitEntityContextMenu: di.inject(visitEntityContextMenuInjectable),
    activeEntity: di.inject(activeEntityInjectable),
    navigate: di.inject(navigateInjectable),
  }),
});
