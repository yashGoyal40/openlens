/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useEffect, useRef } from "react";
import { observer } from "mobx-react";
import type { IComputedValue } from "mobx";
import { editor } from "monaco-editor";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { LensTheme } from "../../themes/lens-theme";
import activeThemeInjectable from "../../themes/active.injectable";

export interface MonacoDiffEditorProps {
  original: string;
  modified: string;
  className?: string;
  language?: string;
}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

/**
 * Two versions side by side, read only, such as the changes to a resource before saving them
 */
const NonInjectedMonacoDiffEditor = observer(({ original, modified, className, language = "yaml", activeTheme }: MonacoDiffEditorProps & Dependencies) => {
  const container = useRef<HTMLDivElement>(null);
  const theme = activeTheme.get().monacoTheme;

  useEffect(() => {
    if (!container.current) {
      return undefined;
    }

    const diffEditor = editor.createDiffEditor(container.current, {
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      theme,
    });
    const originalModel = editor.createModel(original, language);
    const modifiedModel = editor.createModel(modified, language);

    diffEditor?.setModel({ original: originalModel, modified: modifiedModel });

    return () => {
      diffEditor?.dispose();
      originalModel?.dispose();
      modifiedModel?.dispose();
    };
  }, [original, modified, language, theme]);

  return (
    <div
      className={className}
      ref={container}
      data-testid="monaco-diff-editor"
    />
  );
});

export const MonacoDiffEditor = withInjectables<Dependencies, MonacoDiffEditorProps>(NonInjectedMonacoDiffEditor, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
