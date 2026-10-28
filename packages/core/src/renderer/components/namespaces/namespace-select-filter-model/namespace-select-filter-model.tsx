/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { IComputedValue } from "mobx";
import { observable, action, computed, comparer } from "mobx";
import type { NamespaceStore } from "../store";
import type { ActionMeta, MultiValue } from "react-select";
import { Icon } from "@k8slens/icon";
import type { SelectOption } from "../../select";
import { cssNames, observableCrate } from "@k8slens/utilities";
import type { IsMultiSelectionKey } from "./is-selection-key.injectable";
import type { ClusterContext } from "../../../cluster-frame-context/cluster-frame-context";

interface Dependencies {
  context: ClusterContext;
  namespaceStore: NamespaceStore;
  isMultiSelectionKey: IsMultiSelectionKey;
}

export const selectAllNamespaces = Symbol("all-namespaces-selected");

export type SelectAllNamespaces = typeof selectAllNamespaces;
export type NamespaceSelectFilterOption = SelectOption<string | SelectAllNamespaces>;

export interface NamespaceSelectFilterModel {
  readonly options: IComputedValue<readonly NamespaceSelectFilterOption[]>;
  readonly menu: {
    open: () => void;
    close: () => void;
    readonly isOpen: IComputedValue<boolean>;
  };
  onChange: (newValue: MultiValue<NamespaceSelectFilterOption>, actionMeta: ActionMeta<NamespaceSelectFilterOption>) => void;
  onClick: () => void;

  /**
   * Pressing an option's checkbox toggles that namespace and keeps the menu open
   */
  onCheckboxMouseDown: () => void;
  onKeyDown: React.KeyboardEventHandler;
  onKeyUp: React.KeyboardEventHandler;
  reset: () => void;
  isOptionSelected: (option: NamespaceSelectFilterOption) => boolean;
  formatOptionLabel: (option: NamespaceSelectFilterOption) => JSX.Element;
}

enum SelectMenuState {
  Close = "close",
  Open = "open",
}

export function namespaceSelectFilterModelFor(dependencies: Dependencies): NamespaceSelectFilterModel {
  const { isMultiSelectionKey, namespaceStore, context } = dependencies;

  let didToggle = false;
  let isMultiSelection = false;
  let isCheckboxToggle = false;
  const menuState = observableCrate(SelectMenuState.Close, [{
    from: SelectMenuState.Close,
    to: SelectMenuState.Open,
    onTransition: () => {
      optionsSortingSelected.replace(selectedNames.get());
      didToggle = false;
    },
  }]);
  const selectedNames = computed(() => new Set(context.contextNamespaces), {
    equals: comparer.structural,
  });
  const optionsSortingSelected = observable.set(selectedNames.get());
  const sortNamespacesByIfTheyHaveBeenSelected = (left: string, right: string) => {
    const isLeftSelected = optionsSortingSelected.has(left);
    const isRightSelected = optionsSortingSelected.has(right);

    if (isLeftSelected === isRightSelected) {
      return 0;
    }

    return isRightSelected
      ? 1
      : -1;
  };
  const options = computed((): readonly NamespaceSelectFilterOption[] => [
    {
      value: selectAllNamespaces,
      label: "All namespaces",
      id: "all-namespaces",
    },
    ...context
      .allNamespaces
      .sort(sortNamespacesByIfTheyHaveBeenSelected)
      .map(namespace => ({
        value: namespace,
        label: namespace,
        id: namespace,
      })),
  ]);
  const menuIsOpen = computed(() => menuState.get() === SelectMenuState.Open);
  const isOptionSelected: NamespaceSelectFilterModel["isOptionSelected"] = (option) => {
    if (option.value === selectAllNamespaces) {
      return false;
    }

    return selectedNames.get().has(option.value);
  };

  const model: NamespaceSelectFilterModel = {
    options,
    menu: {
      close: action(() => {
        menuState.set(SelectMenuState.Close);
      }),
      open: action(() => {
        menuState.set(SelectMenuState.Open);
      }),
      isOpen: menuIsOpen,
    },
    onChange: (_, action) => {
      switch (action.action) {
        case "clear":
          namespaceStore.selectAll();
          break;
        case "deselect-option":
        case "select-option":
          if (action.option) {
            didToggle = true;

            if (action.option.value === selectAllNamespaces) {
              namespaceStore.selectAll();
            } else if (isMultiSelection || isCheckboxToggle) {
              namespaceStore.toggleSingle(action.option.value);
            } else {
              namespaceStore.selectSingle(action.option.value);
            }
          }
          break;
      }
    },
    onClick: () => {
      if (!menuIsOpen.get()) {
        model.menu.open();
      } else if (!isMultiSelection && !isCheckboxToggle) {
        model.menu.close();
      }

      isCheckboxToggle = false;
    },
    onCheckboxMouseDown: () => {
      isCheckboxToggle = true;
    },
    onKeyDown: (event) => {
      if (isMultiSelectionKey(event)) {
        isMultiSelection = true;
      }
    },
    onKeyUp: (event) => {
      if (isMultiSelectionKey(event)) {
        isMultiSelection = false;

        if (didToggle) {
          model.menu.close();
        }
      }
    },
    reset: action(() => {
      isMultiSelection = false;
      model.menu.close();
    }),
    isOptionSelected,
    formatOptionLabel: (option) => {
      const namespace = option.value === selectAllNamespaces ? undefined : option.value;
      const checked = namespace === undefined
        ? namespaceStore.areAllSelectedImplicitly
        : isOptionSelected(option);

      return (
        <div className="NamespaceSelectFilterOption">
          <span
            className={cssNames("NamespaceSelectFilterCheckbox", { checked })}
            onMouseDown={model.onCheckboxMouseDown}
            data-testid={`namespace-select-filter-checkbox-${namespace ?? "all-namespaces"}`}
          >
            {checked && (
              <Icon
                smallest
                material="check"
                data-testid={namespace && `namespace-select-filter-option-${namespace}-selected`}
              />
            )}
          </span>
          <span className="NamespaceSelectFilterLabel">{namespace ?? "All namespaces"}</span>
        </div>
      );
    },
  };

  return model;
}
