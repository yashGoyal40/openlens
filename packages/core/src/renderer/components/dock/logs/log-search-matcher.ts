/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { SearchStore } from "../../../search-store/search-store";

export interface LogSearchOptions {
  /**
   * The query is a regular expression instead of plain text
   */
  isRegex: boolean;

  /**
   * Upper and lower case letters are distinguished
   */
  isCaseSensitive: boolean;
}

export type LogSearchMatcher =
  | { regex: RegExp; error?: undefined }
  | { regex?: undefined; error: string };

export interface MatchRange {
  start: number;
  end: number;
}

/**
 * Creates the regular expression for searching logs
 * @returns `undefined` when there is nothing to search for, otherwise either the (global) regex or the
 * reason why the query is not a valid regular expression
 */
export function createLogSearchMatcher(query: string, { isRegex, isCaseSensitive }: LogSearchOptions): LogSearchMatcher | undefined {
  if (!query) {
    return undefined;
  }

  const flags = isCaseSensitive ? "g" : "gi";

  if (!isRegex) {
    return { regex: new RegExp(SearchStore.escapeRegex(query), flags) };
  }

  try {
    return { regex: new RegExp(query, flags) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Finds all non-empty matches of `regex` within `line`
 * @param regex A regex with the global flag set
 */
export function findMatchRanges(line: string, regex: RegExp): MatchRange[] {
  const ranges: MatchRange[] = [];

  for (const match of line.matchAll(regex)) {
    if (match[0].length > 0 && match.index !== undefined) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  return ranges;
}

/**
 * Whether `line` contains at least one non-empty match of `regex`
 * @param regex A regex with the global flag set
 */
export function lineMatches(line: string, regex: RegExp): boolean {
  return findMatchRanges(line, regex).length > 0;
}
