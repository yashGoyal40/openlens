/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./view.module.scss";
import React, { useRef, useState } from "react";
import { observer } from "mobx-react";
import { Spinner } from "@k8slens/spinner";
import { Icon } from "@k8slens/icon";
import type { ShowCheckedErrorNotification } from "@k8slens/notifications";
import { showCheckedErrorNotificationInjectable } from "@k8slens/notifications";
import { cssNames } from "@k8slens/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { EditResourceModel } from "./edit-resource-model/edit-resource-model.injectable";
import editResourceModelInjectable from "./edit-resource-model/edit-resource-model.injectable";
import { EditorPanel } from "../editor-panel";
import { Notice } from "../../extensions/notice";
import type { MonacoEditorRef } from "../../monaco-editor";
import { MonacoDiffEditor } from "../../monaco-editor/monaco-diff-editor";
import { getYamlErrorPosition } from "../../monaco-editor/monaco-validators";
import type { ShowDetails } from "../../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../../kube-detail-params/show-details.injectable";

export interface EditResourceProps {
  tabId: string;
}

interface Dependencies {
  model: EditResourceModel;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  showDetails: ShowDetails;
}

interface ToolbarButtonProps {
  icon: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "data-testid"?: string;
}

const ToolbarButton = ({ icon, title, onClick, disabled, active, "data-testid": testId }: ToolbarButtonProps) => (
  <button
    type="button"
    className={cssNames(styles.button, { [styles.active]: active })}
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    data-testid={testId}
  >
    <Icon material={icon} />
  </button>
);

const NonInjectedEditResource = observer(({
  model,
  tabId,
  showCheckedErrorNotification,
  showDetails,
}: EditResourceProps & Dependencies) => {
  const editor = useRef<MonacoEditorRef>(null);
  const [saving, setSaving] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  if (model.shouldShowErrorAboutNoResource) {
    return (
      <div className="EditResource flex column">
        <Notice>
          Resource not found
        </Notice>
      </div>
    );
  }

  const error = model.configuration.error.value.get();
  const value = model.configuration.value.get();

  const save = async () => {
    if (saving || error) {
      return;
    }

    setSaving(true);

    try {
      await model.save();
    } catch (saveError) {
      showCheckedErrorNotification(saveError, "Unknown error while saving");
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
    }
  };

  return (
    <div className={cssNames("EditResource flex column", styles.EditResource)} onKeyDown={onKeyDown}>
      <div className={styles.toolbar}>
        <ToolbarButton
          icon="save"
          title="Save (⌘S)"
          onClick={() => void save()}
          disabled={saving || Boolean(error)}
          data-testid={`save-edit-resource-from-tab-for-${tabId}`}
        />
        <ToolbarButton
          icon="refresh"
          title="Reload from the cluster, discarding changes"
          onClick={() => void model.reload()}
          disabled={saving}
          data-testid={`reload-edit-resource-from-tab-for-${tabId}`}
        />
        <ToolbarButton
          icon="compare_arrows"
          title={showChanges ? "Back to editing" : "Show changes"}
          onClick={() => setShowChanges(!showChanges)}
          active={showChanges}
          data-testid={`changes-edit-resource-from-tab-for-${tabId}`}
        />
        <ToolbarButton
          icon="search"
          title="Find"
          onClick={() => editor.current?.find?.()}
          disabled={showChanges}
          data-testid={`find-edit-resource-from-tab-for-${tabId}`}
        />
        {saving && (
          <Spinner className={styles.spinner} data-testid={`saving-edit-resource-from-tab-for-${tabId}`} />
        )}
        {error && (
          <button
            type="button"
            className={styles.error}
            title={`${error}\nClick to go there`}
            onClick={() => {
              const position = getYamlErrorPosition(error);

              if (position) {
                editor.current?.goTo?.(position.line, position.column);
              }
            }}
            data-testid={`error-edit-resource-from-tab-for-${tabId}`}
          >
            <Icon material="error_outline" small />
            <span>{error}</span>
          </button>
        )}
      </div>
      <div className={styles.title}>
        {`Editing kubernetes ${model.kind} `}
        <a
          onClick={() => showDetails(model.selfLinkForDetails, false)}
          data-testid={`edit-resource-details-link-for-${tabId}`}
        >
          {model.name}
        </a>
      </div>
      {showChanges && (
        <MonacoDiffEditor
          className={styles.diff}
          original={model.original}
          modified={value}
        />
      )}
      <EditorPanel
        tabId={tabId}
        value={value}
        onChange={model.configuration.onChange}
        onError={model.configuration.error.onChange}
        hidden={showChanges}
        editorRef={editor}
      />
    </div>
  );
});

export const EditResource = withInjectables<Dependencies, EditResourceProps>(NonInjectedEditResource, {
  getPlaceholder: () => (
    <Spinner center data-testid="edit-resource-tab-spinner" />
  ),
  getProps: async (di, props) => ({
    ...props,
    model: await di.inject(editResourceModelInjectable, props.tabId),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    showDetails: di.inject(showDetailsInjectable),
  }),
});
