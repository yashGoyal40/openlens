/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./job-history.module.scss";
import React from "react";
import { observer } from "mobx-react";
import { now } from "mobx-utils";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { Job } from "@k8slens/kube-object";
import { cssNames, formatDuration, prevDefault, stopPropagation } from "@k8slens/utilities";
import { DrawerTitle } from "../drawer";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectMenu } from "../kube-object-menu";
import type { ShowDetails } from "../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../kube-detail-params/show-details.injectable";

/**
 * How long a job ran, or has been running
 */
export const getJobDuration = (job: Job, current: number) => {
  const { startTime, completionTime } = job.status ?? {};

  if (!startTime) {
    return undefined;
  }

  const end = completionTime ? Date.parse(completionTime) : current;

  return Math.max(0, end - Date.parse(startTime));
};

/**
 * Newer clusters also set conditions such as SuccessCriteriaMet, so the final ones are looked for
 */
export const getJobState = (job: Job): "complete" | "failed" | "running" => {
  const hasCondition = (type: string) => job.status?.conditions?.some(condition => condition.type === type && condition.status === "True");

  if (hasCondition("Failed")) {
    return "failed";
  }

  return hasCondition("Complete") ? "complete" : "running";
};

const stateTitles = {
  complete: "Complete",
  failed: "Failed",
  running: "Running",
};

const JobDuration = observer(({ job }: { job: Job }) => {
  const duration = getJobDuration(job, job.status?.completionTime ? 0 : now(1000));

  return <>{duration === undefined ? "-" : formatDuration(duration, true)}</>;
});

export interface JobHistoryProps {
  jobs: Job[];
}

interface Dependencies {
  showDetails: ShowDetails;
}

/**
 * The jobs a cron job started, newest first
 */
const NonInjectedJobHistory = observer(({ jobs, showDetails }: JobHistoryProps & Dependencies) => {
  const sorted = [...jobs].sort((left, right) => right.getCreationTimestamp() - left.getCreationTimestamp());

  return (
    <>
      <DrawerTitle>Job History</DrawerTitle>
      {sorted.length === 0
        ? <div className={styles.empty}>No jobs found</div>
        : (
          <div className={styles.JobHistory} role="table">
            <div className={styles.header} role="row">
              <span role="columnheader">Job</span>
              <span role="columnheader">Duration</span>
              <span role="columnheader">Age</span>
              <span />
            </div>
            {sorted.map(job => (
              <div
                key={job.getId()}
                className={cssNames(styles.job, styles[getJobState(job)])}
                role="row"
                title={stateTitles[getJobState(job)]}
                onClick={prevDefault(() => showDetails(job.selfLink, false))}
                data-testid={`job-history-${job.getName()}`}
              >
                <span className={styles.name}>{job.getName()}</span>
                <span><JobDuration job={job} /></span>
                <span><KubeObjectAge object={job} /></span>
                <span onClick={stopPropagation}>
                  <KubeObjectMenu object={job} />
                </span>
              </div>
            ))}
          </div>
        )}
    </>
  );
});

export const JobHistory = withInjectables<Dependencies, JobHistoryProps>(NonInjectedJobHistory, {
  getProps: (di, props) => ({
    ...props,
    showDetails: di.inject(showDetailsInjectable),
  }),
});
