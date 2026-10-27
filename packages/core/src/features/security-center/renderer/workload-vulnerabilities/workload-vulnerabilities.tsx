/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "../components/security-center.module.scss";

import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { KubeObject } from "@k8slens/kube-object";
import type { KubeObjectStore } from "../../../../common/k8s-api/kube-object.store";
import type { SubscribeStores } from "../../../../renderer/kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../../../renderer/kube-watch-api/subscribe-stores.injectable";
import type { ReplicaSetStore } from "../../../../renderer/components/workloads-replicasets/store";
import replicaSetStoreInjectable from "../../../../renderer/components/workloads-replicasets/store.injectable";
import type { JobStore } from "../../../../renderer/components/workloads-jobs/store";
import jobStoreInjectable from "../../../../renderer/components/workloads-jobs/store.injectable";
import { DrawerItem, DrawerTitle } from "../../../../renderer/components/drawer";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import type { ReportTarget } from "../../common/security-center-resources";
import { VulnerabilityReport } from "../../common/security-center-resources";
import { addSeverityCounts } from "../../common/severity";
import { storeInjectable as vulnerabilityReportStoreInjectable } from "../vulnerability-reports.injectable";
import { SeverityBadges } from "../components/severity-badges";
import { ReportDetailsLink, TargetLink } from "../components/report-target-link";
import { getController, getReportOwners, isReportOf } from "./report-owners";

export interface WorkloadVulnerabilitiesProps {
  object: KubeObject;
}

interface Dependencies {
  subscribeStores: SubscribeStores;
  vulnerabilityReportStore: KubeObjectStore<KubeObject>;
  replicaSetStore: ReplicaSetStore;
  jobStore: JobStore;
}

const isSameTarget = (left: ReportTarget, right: ReportTarget) => left.kind === right.kind && left.name === right.name;

@observer
class NonInjectedWorkloadVulnerabilities extends React.Component<WorkloadVulnerabilitiesProps & Dependencies> {
  componentDidMount() {
    const { object, subscribeStores, vulnerabilityReportStore, replicaSetStore, jobStore } = this.props;

    // besides the reports, only the stores needed to find the owner the reports are filed under
    disposeOnUnmount(this, [
      subscribeStores([
        vulnerabilityReportStore,
        ...(object.kind === "Deployment" ? [replicaSetStore] : []),
        ...(object.kind === "Pod" && getController(object)?.kind === "Job" ? [jobStore] : []),
      ]),
    ]);
  }

  getReports() {
    const { object, vulnerabilityReportStore, replicaSetStore, jobStore } = this.props;
    const owners = getReportOwners(object, {
      getReplicaSetsOf: deployment => replicaSetStore.getReplicaSetsByOwner(deployment),
      getJob: (name, namespace) => jobStore.getByName(name, namespace),
    });
    const reports = vulnerabilityReportStore.getAllByNs(object.getNs() ?? "")
      .filter((report): report is VulnerabilityReport => report instanceof VulnerabilityReport)
      .filter(report => isReportOf(report, owners))
      .sort((left, right) => (left.getContainerName() ?? "").localeCompare(right.getContainerName() ?? ""));

    return { owners, reports };
  }

  render() {
    const { object } = this.props;
    const { owners, reports } = this.getReports();

    if (reports.length === 0) {
      return null;
    }

    const self: ReportTarget = { kind: object.kind, name: object.getName() };
    const scannedAs = owners.filter(owner => (
      !isSameTarget(owner, self)
      && reports.some(report => {
        const target = report.getTarget();

        return target && isSameTarget(owner, target);
      })
    ));

    return (
      <div className="WorkloadVulnerabilities" data-testid="workload-vulnerabilities">
        <DrawerTitle>Vulnerabilities</DrawerTitle>
        <DrawerItem name="Total">
          <SeverityBadges counts={addSeverityCounts(...reports.map(report => report.getSeverityCounts()))} noun="vulnerabilities" />
        </DrawerItem>
        <DrawerItem name="Scanned as" hidden={scannedAs.length === 0}>
          {scannedAs.map((owner, index) => (
            <React.Fragment key={`${owner.kind}/${owner.name}`}>
              {index > 0 && ", "}
              <TargetLink target={owner} parent={object} />
            </React.Fragment>
          ))}
        </DrawerItem>
        <ResourceTable
          rows={reports}
          columns={[
            { title: "Container", value: report => report.getContainerName() },
            {
              title: "Image",
              className: styles.wideCell,
              value: report => <ReportDetailsLink report={report}>{report.getImage() || report.getName()}</ReportDetailsLink>,
            },
            {
              title: "Vulnerabilities",
              className: styles.wideCell,
              value: report => <SeverityBadges compact counts={report.getSeverityCounts()} />,
            },
          ]}
        />
      </div>
    );
  }
}

const InjectedWorkloadVulnerabilities = withInjectables<Dependencies, WorkloadVulnerabilitiesProps>(NonInjectedWorkloadVulnerabilities, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    vulnerabilityReportStore: di.inject(vulnerabilityReportStoreInjectable),
    replicaSetStore: di.inject(replicaSetStoreInjectable),
    jobStore: di.inject(jobStoreInjectable),
  }),
});

/**
 * Keyed by the object, as the stores to subscribe to depend on its kind and owners
 */
export const WorkloadVulnerabilities = ({ object }: WorkloadVulnerabilitiesProps) => (
  <InjectedWorkloadVulnerabilities key={object.getId()} object={object} />
);
