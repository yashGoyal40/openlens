/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./search.scss";

import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { SearchInput } from "../../input";
import { Icon } from "@k8slens/icon";
import type { StrictReactNode } from "@k8slens/utilities";
import { cssNames } from "@k8slens/utilities";
import type { LogTabViewModel } from "./logs-view-model";
import type { LogTabData } from "./tab-store";

export interface PodLogSearchProps {
  onSearch?: (query: string) => void;
  scrollToOverlay: (lineNumber: number | undefined) => void;
  model: LogTabViewModel;
}

interface SearchOptionToggleProps {
  active: boolean;
  title: string;
  onToggle: () => void;
  children: StrictReactNode;
  "data-testid": string;
}

const SearchOptionToggle = ({ active, title, onToggle, children, "data-testid": testId }: SearchOptionToggleProps) => (
  <button
    type="button"
    className={cssNames("search-option", { active })}
    title={title}
    aria-label={title}
    aria-pressed={active}
    onClick={onToggle}
    data-testid={testId}
  >
    {children}
  </button>
);

export const LogSearch = observer(({ onSearch, scrollToOverlay, model }: PodLogSearchProps) => {
  const tabData = model.logTabData.get();
  const logs = model.visibleLogs.get();

  useEffect(() => {
    // Refresh search when logs changed
    model.search();
  }, [logs]);

  if (!tabData) {
    return null;
  }

  const { searchStore } = model;
  const { setNextOverlayActive, setPrevOverlayActive, searchQuery, occurrences, activeFind, totalFinds } = searchStore;
  const jumpDisabled = !searchQuery || !occurrences.length;
  const searchError = model.searchMatcher.get()?.error;

  const setSearch = (query: string) => {
    model.search(query);
    onSearch?.(query);
    scrollToOverlay(searchStore.activeOverlayLine);
  };

  const onPrevOverlay = () => {
    setPrevOverlayActive();
    scrollToOverlay(searchStore.activeOverlayLine);
  };

  const onNextOverlay = () => {
    setNextOverlayActive();
    scrollToOverlay(searchStore.activeOverlayLine);
  };

  const onClear = () => {
    setSearch("");
  };

  const onKeyDown = (evt: React.KeyboardEvent<any>) => {
    if (evt.key === "Enter") {
      if (evt.shiftKey) {
        onPrevOverlay();
      } else {
        onNextOverlay();
      }
    }
  };

  const toggleOption = (option: keyof Pick<LogTabData, "searchIsCaseSensitive" | "searchIsRegex" | "showOnlyMatching">) => () => {
    model.updateLogTabData({ [option]: !tabData[option] });
    model.search();
    scrollToOverlay(searchStore.activeOverlayLine);
  };

  return (
    <div className="LogSearch flex box grow justify-flex-end gaps align-center">
      <SearchInput
        value={searchQuery}
        onChange={setSearch}
        showClearIcon={true}
        className={cssNames({ invalid: Boolean(searchError) })}
        contentRight={(
          <>
            {totalFinds > 0 && (
              <div className="find-count">
                {`${activeFind} / ${totalFinds}`}
              </div>
            )}
            {searchError && (
              <Icon
                material="error_outline"
                className="search-error"
                tooltip={`Invalid regular expression: ${searchError}`}
                small
                data-testid="log-search-error"
              />
            )}
          </>
        )}
        onClear={onClear}
        onKeyDown={onKeyDown}
      />
      <div className="search-options flex align-center">
        <SearchOptionToggle
          active={tabData.searchIsCaseSensitive ?? false}
          title="Match case"
          onToggle={toggleOption("searchIsCaseSensitive")}
          data-testid="log-search-case-sensitive"
        >
          Aa
        </SearchOptionToggle>
        <SearchOptionToggle
          active={tabData.searchIsRegex ?? false}
          title="Use regular expression"
          onToggle={toggleOption("searchIsRegex")}
          data-testid="log-search-regex"
        >
          .*
        </SearchOptionToggle>
        <SearchOptionToggle
          active={tabData.showOnlyMatching ?? false}
          title="Show only matching lines"
          onToggle={toggleOption("showOnlyMatching")}
          data-testid="log-search-show-only-matching"
        >
          <Icon material="filter_list" small />
        </SearchOptionToggle>
      </div>
      <Icon
        material="keyboard_arrow_up"
        tooltip="Previous"
        onClick={onPrevOverlay}
        disabled={jumpDisabled}
      />
      <Icon
        material="keyboard_arrow_down"
        tooltip="Next"
        onClick={onNextOverlay}
        disabled={jumpDisabled}
      />
    </div>
  );
});
