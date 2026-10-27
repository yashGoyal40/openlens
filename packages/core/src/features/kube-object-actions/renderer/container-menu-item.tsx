/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { Container, Pod } from "@k8slens/kube-object";
import type { IconProps } from "@k8slens/icon";
import { Icon } from "@k8slens/icon";
import { MenuItem, SubMenu } from "../../../renderer/components/menu";
import { StatusBrick } from "../../../renderer/components/status-brick";
import { cssNames, prevDefault } from "@k8slens/utilities";

export interface ContainerMenuItemProps {
  pod: Pod;
  containers: Container[];
  title: string;
  icon: Partial<IconProps>;
  toolbar?: boolean;
  onSelect: (container: Container) => void;
  "data-testid"?: string;
}

/**
 * Acts directly on a single container, otherwise offers a sub menu to pick one
 */
export const ContainerMenuItem = ({ pod, containers, title, icon, toolbar, onSelect, "data-testid": testId }: ContainerMenuItemProps) => {
  const [firstContainer] = containers;
  const containerStatuses = pod.getContainerStatuses();

  return (
    <MenuItem
      disabled={!firstContainer}
      onClick={prevDefault(() => firstContainer && onSelect(firstContainer))}
      data-testid={testId}
    >
      <Icon
        {...icon}
        interactive={toolbar}
        tooltip={toolbar ? title : undefined}
      />
      <span className="title">{title}</span>
      {containers.length > 1 && (
        <>
          <Icon className="arrow" material="keyboard_arrow_right" />
          <SubMenu>
            {containers.map(container => {
              const state = containerStatuses.find(status => status.name === container.name)?.state ?? {};
              const [stateName] = Object.keys(state);

              return (
                <MenuItem
                  key={container.name}
                  className="flex align-center"
                  onClick={prevDefault(() => onSelect(container))}
                  data-testid={testId && `${testId}-${container.name}`}
                >
                  <StatusBrick
                    className={cssNames(stateName, { restarted: false })}
                    tooltip={stateName}
                  />
                  <span>{container.name}</span>
                </MenuItem>
              );
            })}
          </SubMenu>
        </>
      )}
    </MenuItem>
  );
};
