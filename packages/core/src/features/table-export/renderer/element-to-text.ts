/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Elements which never contribute to the textual value of a table cell: icons (material icon
 * names are rendered as text glyphs), tooltips and non-textual content.
 */
const nonTextualSelector = [
  ".Icon",
  "[data-icon-name]",
  ".Tooltip",
  "script",
  "style",
  "svg",
  "template",
  "noscript",
].join(", ");

/**
 * Elements whose contents are visually separated from their siblings
 */
const blockLevelTagNames = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION",
  "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV",
  "OL", "P", "PRE", "SECTION", "TABLE", "TD", "TH", "TR", "UL",
]);

const collectText = (node: Node): string => {
  if (node.nodeType === node.TEXT_NODE) {
    return node.nodeValue ?? "";
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return "";
  }

  const element = node as Element;

  if (element.matches(nonTextualSelector)) {
    return "";
  }

  const text = Array.from(element.childNodes, collectText).join("");

  return blockLevelTagNames.has(element.tagName.toUpperCase())
    ? ` ${text} `
    : text;
};

/**
 * Converts rendered HTML into the text a user would read, ignoring icons and tooltips and
 * collapsing all whitespace.
 */
export function elementToText(element: Element): string {
  return Array.from(element.childNodes, collectText)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
