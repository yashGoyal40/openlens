/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import { SearchStore } from "../../../search-store/search-store";
import { findMatchRanges } from "./log-search-matcher";

/**
 * A search store which finds the occurrences using a provided regex, which allows searching for
 * regular expressions and case sensitive searching.
 */
export class LogSearchStore extends SearchStore {
  /**
   * Searches for the occurrences of `regex` within `lines`
   * @param lines The lines as displayed
   * @param query The text in the search input
   * @param regex The regex created from the query, `undefined` if the query is not valid
   */
  searchWith(lines: string[], query: string, regex: RegExp | undefined): void {
    runInAction(() => {
      this.searchQuery = query;

      if (!query) {
        this.activeOverlayIndex = -1;
        this.occurrences = [];

        return;
      }

      this.occurrences = regex
        ? lines.flatMap((line, index) => findMatchRanges(line, regex).map(() => index))
        : [];

      // Keep the active overlay where it is, if it still exists
      if (this.occurrences.length > 0 && this.occurrences[this.activeOverlayIndex] === undefined) {
        this.activeOverlayIndex = 0;
      }
    });
  }
}
