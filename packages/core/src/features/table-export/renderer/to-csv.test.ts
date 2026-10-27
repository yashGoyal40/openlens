/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getCsvFileName, formatFileNameTimestamp } from "./csv-file-name";
import { elementToText } from "./element-to-text";
import { neutralizeCsvFormula, toCsv, toCsvField } from "./to-csv";

describe("table export to CSV", () => {
  describe("toCsvField()", () => {
    it.each([
      ["plain", "plain"],
      ["", ""],
      ["with space", "with space"],
      ["with,comma", "\"with,comma\""],
      ["with \"quotes\"", "\"with \"\"quotes\"\"\""],
      ["multi\nline", "\"multi\nline\""],
      ["carriage\r\nreturn", "\"carriage\r\nreturn\""],
      [" leading space", "\" leading space\""],
      ["trailing space ", "\"trailing space \""],
    ])("given %j, returns %j", (value, expected) => {
      expect(toCsvField(value)).toBe(expected);
    });

    it("neutralizes and then quotes when needed", () => {
      expect(toCsvField("=HYPERLINK(\"http://evil\",\"x\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\"");
    });
  });

  describe("neutralizeCsvFormula()", () => {
    it.each([
      ["=1+2", "'=1+2"],
      ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
      ["-2+3", "'-2+3"],
      ["@SUM(A1)", "'@SUM(A1)"],
      ["\t=1", "'\t=1"],
      ["-", "'-"],
    ])("given %j, prefixes with an apostrophe", (value, expected) => {
      expect(neutralizeCsvFormula(value)).toBe(expected);
    });

    it.each([
      "-1",
      "+2.5",
      "-0.5e3",
      "abc=def",
      "a-b",
      "100%",
    ])("given %j, leaves it as is", (value) => {
      expect(neutralizeCsvFormula(value)).toBe(value);
    });
  });

  describe("toCsv()", () => {
    it("joins fields with commas and rows with CRLF", () => {
      expect(toCsv([
        ["Name", "Namespace", "Labels"],
        ["pod-1", "default", "app=a, tier=b"],
        ["pod-2", "kube-system", ""],
      ])).toBe([
        "Name,Namespace,Labels",
        "pod-1,default,\"app=a, tier=b\"",
        "pod-2,kube-system,",
      ].join("\r\n"));
    });

    it("given no rows, returns empty text", () => {
      expect(toCsv([])).toBe("");
    });
  });

  describe("getCsvFileName()", () => {
    const date = new Date(2023, 0, 2, 3, 4, 5);

    it("formats timestamp as YYYYMMDD-HHmmss in local time", () => {
      expect(formatFileNameTimestamp(date)).toBe("20230102-030405");
    });

    it("uses base name and timestamp", () => {
      expect(getCsvFileName("workloads_pods", date)).toBe("workloads_pods-20230102-030405.csv");
    });

    it("replaces characters which are not file system friendly", () => {
      expect(getCsvFileName("Custom Resources / foo.bar", date)).toBe("Custom_Resources_foo.bar-20230102-030405.csv");
    });

    it("given an empty name, falls back to 'table'", () => {
      expect(getCsvFileName("  ", date)).toBe("table-20230102-030405.csv");
    });
  });

  describe("elementToText()", () => {
    const toText = (html: string) => {
      const body = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;

      return elementToText(body);
    };

    it("returns text content", () => {
      expect(toText("<span>some <b>text</b></span>")).toBe("some text");
    });

    it("removes material icon glyph names", () => {
      expect(toText("<i class=\"Icon material\"><span class=\"icon\" data-icon-name=\"warning\">warning</span></i><span>Running</span>")).toBe("Running");
    });

    it("removes tooltips", () => {
      expect(toText("<span>name</span><div class=\"Tooltip\">name</div>")).toBe("name");
    });

    it("separates block level elements with a space and collapses whitespace", () => {
      expect(toText("<div>a</div><div>b</div>\n\n<p>  c  </p>")).toBe("a b c");
    });
  });
});
