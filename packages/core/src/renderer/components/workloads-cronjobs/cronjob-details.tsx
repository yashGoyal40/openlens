/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./cronjob-details.scss";

import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import { DrawerItem } from "../drawer";
import { CronJobNextExecutionDetails, getCronJobTimeZone } from "./next-execution";
import { JobHistory } from "./job-history";
import type { JobStore } from "../workloads-jobs/store";
import type { CronJobStore } from "./store";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { CronJob } from "@k8slens/kube-object";
import type { Logger } from "@k8slens/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import cronJobStoreInjectable from "./store.injectable";
import jobStoreInjectable from "../workloads-jobs/store.injectable";
import { loggerInjectionToken } from "@k8slens/logger";

export interface CronJobDetailsProps extends KubeObjectDetailsProps<CronJob> {
}

interface Dependencies {
  subscribeStores: SubscribeStores;
  jobStore: JobStore;
  cronJobStore: CronJobStore;
  logger: Logger;
}

@observer
class NonInjectedCronJobDetails extends React.Component<CronJobDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [
      this.props.subscribeStores([
        this.props.jobStore,
      ]),
    ]);
  }

  render() {
    const { object: cronJob, jobStore, cronJobStore } = this.props;

    if (!cronJob) {
      return null;
    }

    if (!(cronJob instanceof CronJob)) {
      this.props.logger.error("[CronJobDetails]: passed object that is not an instanceof CronJob", cronJob);

      return null;
    }

    return (
      <div className="CronJobDetails">
        <DrawerItem name="Schedule">
          {
            cronJob.isNeverRun()
              ? `never (${cronJob.getSchedule()})`
              : cronJob.getSchedule()
          }
        </DrawerItem>
        <DrawerItem name="Active">
          {cronJobStore.getActiveJobsNum(cronJob)}
        </DrawerItem>
        <DrawerItem name="Suspend">
          {cronJob.getSuspendFlag()}
        </DrawerItem>
        <DrawerItem name="Last schedule">
          {cronJob.getLastScheduleTime()}
        </DrawerItem>
        <DrawerItem name="Next execution">
          <CronJobNextExecutionDetails cronJob={cronJob} />
        </DrawerItem>
        <DrawerItem name="Time zone">
          {getCronJobTimeZone(cronJob)}
        </DrawerItem>
        <JobHistory jobs={jobStore.getJobsByOwner(cronJob)} />
      </div>
    );
  }
}

export const CronJobDetails = withInjectables<Dependencies, CronJobDetailsProps>(NonInjectedCronJobDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    cronJobStore: di.inject(cronJobStoreInjectable),
    jobStore: di.inject(jobStoreInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
