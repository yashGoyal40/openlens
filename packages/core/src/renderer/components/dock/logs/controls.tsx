/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./controls.module.scss";

import { observer } from "mobx-react";
import React from "react";

import { Checkbox } from "../../checkbox";
import type { SelectOption } from "../../select";
import { Select } from "../../select";
import { DownloadLogsDropdown } from "./download-logs-dropdown";
import type { LogTabViewModel } from "./logs-view-model";
import { logsSinceOptions } from "./since-options";

export interface LogControlsProps {
  model: LogTabViewModel;
}

export const LogControls = observer(({ model }: LogControlsProps) => {
  const tabData = model.logTabData.get();
  const pod = model.pod.get();

  if (!tabData || !pod) {
    return null;
  }

  const logs = model.timestampSplitLogs.get();
  const { showTimestamps, showPrevious: previous, wrapLines = false, sinceSeconds = 0 } = tabData;
  const since = logs.length ? logs[0][0] : null;
  const sinceOptions = logsSinceOptions.some(option => option.value === sinceSeconds)
    ? logsSinceOptions
    : [...logsSinceOptions, { value: sinceSeconds, label: `${sinceSeconds}s` }];

  const toggleTimestamps = () => {
    model.updateLogTabData({ showTimestamps: !showTimestamps });
  };

  const togglePrevious = () => {
    model.updateLogTabData({ showPrevious: !previous });
    model.reloadLogs();
  };

  const toggleWrapLines = () => {
    model.updateLogTabData({ wrapLines: !wrapLines });
  };

  const onSinceChange = (option: SelectOption<number> | null) => {
    if (!option || option.value === sinceSeconds) {
      return;
    }

    model.updateLogTabData({ sinceSeconds: option.value || undefined });
    model.reloadLogs();
  };

  return (
    <div className={styles.controls} data-testid="log-controls">
      <div>
        {since && (
          <span>
            Logs from
            {" "}
            <b>{new Date(since).toLocaleString()}</b>
          </span>
        )}
      </div>
      <div className="flex gaps align-center">
        <Checkbox
          label="Show timestamps"
          value={showTimestamps}
          onChange={toggleTimestamps}
          className="show-timestamps"
        />
        <Checkbox
          label="Show previous terminated container"
          value={previous}
          onChange={togglePrevious}
          className="show-previous"
        />
        <Checkbox
          label="Wrap lines"
          value={wrapLines}
          onChange={toggleWrapLines}
          className="wrap-lines"
        />
        <div className={styles.since}>
          <span>Since</span>
          <Select<number, SelectOption<number>, false>
            id="logs-since-selector-input"
            options={sinceOptions}
            value={sinceSeconds}
            onChange={onSinceChange}
            isClearable={false}
            isSearchable={false}
            menuPlacement="top"
            className="since-selector"
            menuClass="since-selector-menu"
          />
        </div>

        <DownloadLogsDropdown
          disabled={logs.length === 0}
          downloadVisibleLogs={model.downloadLogs}
          downloadAllLogs={model.downloadAllLogs}
          downloadFilteredLogs={model.isFilteringByMatch.get() ? model.downloadFilteredLogs : undefined}
        />
      </div>
    </div>
  );
});
