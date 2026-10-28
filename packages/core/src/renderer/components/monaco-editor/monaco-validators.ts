/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import yaml from "js-yaml";

export interface MonacoValidator {
  (value: string): void;
}

interface YamlErrorDetails {
  reason?: string;
  mark?: { line: number; column: number };
}

/**
 * Such as "Line 10, column 9: a multiline key may not be an implicit key", without the excerpt js-yaml adds
 */
export function formatYamlError(error: unknown): string {
  const { reason, mark } = (error ?? {}) as YamlErrorDetails;

  if (typeof reason !== "string" || !mark) {
    return String(error);
  }

  return `Line ${mark.line + 1}, column ${mark.column + 1}: ${reason}`;
}

/**
 * The position in an error from formatYamlError, to move the cursor there
 */
export function getYamlErrorPosition(message: string): { line: number; column: number } | undefined {
  const match = /^Line (\d+), column (\d+):/.exec(message);

  return match
    ? { line: Number(match[1]), column: Number(match[2]) }
    : undefined;
}

export function yamlValidator(value: string) {
  try {
    yaml.loadAll(value);
  } catch (error) {
    throw formatYamlError(error);
  }
}

export function jsonValidator(value: string) {
  try {
    JSON.parse(value);
  } catch (error) {
    throw String(error);
  }
}

export const monacoValidators = {
  yaml: yamlValidator,
  json: jsonValidator,
};
