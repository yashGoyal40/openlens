/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getYamlErrorPosition, yamlValidator } from "./monaco-validators";

const errorOf = (value: string) => {
  try {
    yamlValidator(value);
  } catch (error) {
    return error as string;
  }

  return undefined;
};

describe("yamlValidator", () => {
  it("accepts valid YAML", () => {
    expect(errorOf("metadata:\n  name: some-name\n")).toBeUndefined();
  });

  it("reports where the YAML breaks, without the excerpt", () => {
    const error = errorOf("metadata:\n  resourceVersion: '2992757\n  generation: 1\n  labels:\n    a: b\n");

    expect(error).toMatch(/^Line \d+, column \d+: /);
    expect(error).not.toContain("YAMLException");
    expect(error).not.toContain("|");
  });

  it("gives the position back to move the cursor there", () => {
    expect(getYamlErrorPosition("Line 10, column 9: a multiline key may not be an implicit key")).toEqual({ line: 10, column: 9 });
    expect(getYamlErrorPosition("something else")).toBeUndefined();
  });
});
