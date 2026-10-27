/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Characters which make spreadsheet applications interpret a cell as a formula
 * (or as a DDE command) when they are the first character of the cell.
 */
const formulaTriggerChars = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * Plain numbers (eg. "-1" or "+2.5") are harmless and are left as is so that they
 * stay usable as numbers in spreadsheets.
 */
const plainNumberRegex = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

const needsQuotingRegex = /[",\r\n]|^\s|\s$/;

/**
 * Prefixes values which could be interpreted as a formula with an apostrophe
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */
export function neutralizeCsvFormula(value: string): string {
  if (formulaTriggerChars.has(value.charAt(0)) && !plainNumberRegex.test(value)) {
    return `'${value}`;
  }

  return value;
}

/**
 * Converts a single value into a CSV field, quoting and escaping it if required
 */
export function toCsvField(value: string): string {
  const safeValue = neutralizeCsvFormula(value);

  if (needsQuotingRegex.test(safeValue)) {
    return `"${safeValue.replace(/"/g, "\"\"")}"`;
  }

  return safeValue;
}

/**
 * Converts rows of values into CSV (RFC 4180) text
 */
export function toCsv(rows: string[][]): string {
  return rows
    .map(row => row.map(toCsvField).join(","))
    .join("\r\n");
}
