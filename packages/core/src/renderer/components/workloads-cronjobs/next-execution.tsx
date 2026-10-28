/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { observer } from "mobx-react";
import { now } from "mobx-utils";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { CronJob } from "@k8slens/kube-object";
import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { formatExecutionTime, formatTimeUntil, getNextExecution, splitScheduleTimeZone } from "./cron-schedule";

/**
 * Without a time zone the controller manager runs cron jobs in its own, which is UTC on managed clusters
 */
const defaultTimeZone = "UTC";

export const getCronJobTimeZone = (cronJob: CronJob) => (
  (cronJob.spec as CronJob["spec"] & { timeZone?: string }).timeZone
  ?? splitScheduleTimeZone(cronJob.getSchedule()).timeZone
);

/**
 * When a cron job runs next, undefined when it is suspended or never runs
 */
export const getCronJobNextExecution = (cronJob: CronJob, after: number) => (
  cronJob.spec.suspend
    ? undefined
    : getNextExecution(cronJob.getSchedule(), after, getCronJobTimeZone(cronJob) ?? defaultTimeZone)
);

const second = 1000;
const hour = 60 * 60 * second;

/**
 * Seconds are only shown below an hour, so further away there is no need to update every second
 */
const getRefreshedNow = (cronJob: CronJob) => {
  const coarse = now(60 * second);
  const next = getCronJobNextExecution(cronJob, coarse);

  return next !== undefined && next - coarse < 2 * hour
    ? now(second)
    : coarse;
};

/**
 * Such as "In 18 minutes 40 seconds", or "N/A"
 */
export const CronJobNextExecution = observer(({ cronJob }: { cronJob: CronJob }) => {
  const current = getRefreshedNow(cronJob);
  const next = getCronJobNextExecution(cronJob, current);

  return <>{next === undefined ? "N/A" : formatTimeUntil(next - current)}</>;
});

interface Dependencies {
  state: UserPreferencesState;
}

/**
 * The next run, and when that is in the time zone of the cron job and in the local one
 */
const NonInjectedCronJobNextExecutionDetails = observer(({ cronJob, state }: { cronJob: CronJob } & Dependencies) => {
  const current = getRefreshedNow(cronJob);
  const next = getCronJobNextExecution(cronJob, current);

  if (next === undefined) {
    return <>N/A</>;
  }

  return (
    <>
      <div>{formatTimeUntil(next - current)}</div>
      <div>{formatExecutionTime(next, getCronJobTimeZone(cronJob) ?? defaultTimeZone, "CronJob time zone", current)}</div>
      <div>{formatExecutionTime(next, state.localeTimezone, "Local time zone", current)}</div>
    </>
  );
});

export const CronJobNextExecutionDetails = withInjectables<Dependencies, { cronJob: CronJob }>(NonInjectedCronJobNextExecutionDetails, {
  getProps: (di, props) => ({
    ...props,
    state: di.inject(userPreferencesStateInjectable),
  }),
});
