/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createLogSearchMatcher, findMatchRanges, lineMatches } from "../log-search-matcher";
import { LogSearchStore } from "../log-search-store";

describe("log search", () => {
  describe("createLogSearchMatcher()", () => {
    it("given an empty query, returns nothing", () => {
      expect(createLogSearchMatcher("", { isRegex: true, isCaseSensitive: true })).toBeUndefined();
    });

    it("given plain text, matches it literally and case insensitively", () => {
      const regex = createLogSearchMatcher("a.b", { isRegex: false, isCaseSensitive: false })?.regex;

      expect(regex && lineMatches("xA.Bx", regex)).toBe(true);
      expect(regex && lineMatches("aXb", regex)).toBe(false);
    });

    it("given case sensitivity, distinguishes letter case", () => {
      const regex = createLogSearchMatcher("Error", { isRegex: false, isCaseSensitive: true })?.regex;

      expect(regex && lineMatches("an Error", regex)).toBe(true);
      expect(regex && lineMatches("an error", regex)).toBe(false);
    });

    it("given a regular expression, matches it", () => {
      const regex = createLogSearchMatcher("status=5\\d\\d", { isRegex: true, isCaseSensitive: false })?.regex;

      expect(regex && lineMatches("GET / status=503", regex)).toBe(true);
      expect(regex && lineMatches("GET / status=200", regex)).toBe(false);
    });

    it("given an invalid regular expression, returns the error", () => {
      const matcher = createLogSearchMatcher("(unclosed", { isRegex: true, isCaseSensitive: false });

      expect(matcher?.regex).toBeUndefined();
      expect(matcher?.error).toEqual(expect.any(String));
    });
  });

  describe("findMatchRanges()", () => {
    it("finds all matches", () => {
      expect(findMatchRanges("foo bar foo", /foo/g)).toEqual([
        { start: 0, end: 3 },
        { start: 8, end: 11 },
      ]);
    });

    it("ignores empty matches", () => {
      expect(findMatchRanges("abc", /x*/g)).toEqual([]);
    });
  });

  describe("LogSearchStore", () => {
    let store: LogSearchStore;

    beforeEach(() => {
      store = new LogSearchStore();
    });

    it("finds the occurrences of the regex in the lines", () => {
      store.searchWith(["foo foo", "bar", "Foo"], "foo", /foo/g);

      expect(store.searchQuery).toBe("foo");
      expect(store.occurrences).toEqual([0, 0]);
      expect(store.activeOverlayLine).toBe(0);
    });

    it("given no regex (an invalid query), finds nothing but keeps the query", () => {
      store.searchWith(["foo"], "(foo", undefined);

      expect(store.searchQuery).toBe("(foo");
      expect(store.totalFinds).toBe(0);
    });

    it("keeps the active overlay when it still exists", () => {
      store.searchWith(["foo", "foo", "foo"], "foo", /foo/g);
      store.setNextOverlayActive();
      store.searchWith(["foo", "foo", "foo", "foo"], "foo", /foo/g);

      expect(store.activeFind).toBe(2);
    });

    it("given an empty query, resets", () => {
      store.searchWith(["foo"], "foo", /foo/g);
      store.searchWith(["foo"], "", undefined);

      expect(store.occurrences).toEqual([]);
      expect(store.activeOverlayIndex).toBe(-1);
    });
  });
});
