/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { MonacoDiffEditorProps } from "../monaco-diff-editor";

export const MonacoDiffEditor = ({ original, modified, className }: MonacoDiffEditorProps) => (
  <div className={className} data-testid="monaco-diff-editor">
    <pre data-testid="monaco-diff-editor-original">{original}</pre>
    <pre data-testid="monaco-diff-editor-modified">{modified}</pre>
  </div>
);
