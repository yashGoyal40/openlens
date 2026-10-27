/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./components/security-center.module.scss";

import React from "react";
import type { ComplianceControl } from "../common/security-center-resources";
import { ClusterComplianceReport, clusterComplianceReportsDescriptor } from "../common/security-center-resources";
import { clusterComplianceReportsRoutes } from "../common/security-center-routes.injectable";
import { severityRank } from "../common/severity";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { StatusBadge } from "../../resource-views/renderer/components/status-badge";
import { LocaleDate } from "../../../renderer/components/locale-date";
import { SeverityBadge } from "./components/severity-badges";
import securityCenterSidebarGroupInjectable from "./security-center-sidebar-group.injectable";

const ComplianceSummary = ({ report }: { report: ClusterComplianceReport }) => (
  <div className={styles.severityBadges}>
    <StatusBadge tone="success" label={`${report.getPassCount()} passed`} />
    <StatusBadge tone={report.getFailCount() > 0 ? "error" : "vague"} label={`${report.getFailCount()} failed`} />
  </div>
);

const ControlStatus = ({ failures, control }: { failures: number | undefined; control: ComplianceControl }) => {
  if (failures === undefined) {
    return control.checks?.length
      ? <StatusBadge tone="vague" label="No result" />
      : (
        <StatusBadge
          tone="vague"
          label="Manual"
          tooltip="This control has no automated checks" />
      );
  }

  return failures > 0
    ? <StatusBadge tone="error" label="Fail" />
    : <StatusBadge tone="success" label="Pass" />;
};

const ComplianceControlsTable = ({ object: report }: { object: ClusterComplianceReport }) => {
  const failures = report.getControlFailures();
  const controls = report.spec?.compliance?.controls?.slice().sort((left, right) => (
    (failures.get(right.id) ?? 0) - (failures.get(left.id) ?? 0)
    || severityRank(left.severity) - severityRank(right.severity)
    || left.id.localeCompare(right.id, undefined, { numeric: true })
  ));

  return (
    <ResourceTable
      title="Controls"
      rows={controls}
      columns={[
        { title: "ID", className: styles.narrowCell, value: control => control.id },
        {
          title: "Name",
          className: styles.wideCell,
          value: control => <span title={control.description}>{control.name}</span>,
        },
        { title: "Severity", value: control => <SeverityBadge severity={control.severity} /> },
        { title: "Status", value: control => <ControlStatus control={control} failures={failures.get(control.id)} /> },
        { title: "Failures", className: styles.narrowCell, value: control => failures.get(control.id) },
      ]}
    />
  );
};

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ClusterComplianceReport>({
  descriptor: clusterComplianceReportsDescriptor,
  objectConstructor: ClusterComplianceReport,
  routes: clusterComplianceReportsRoutes,
  sidebar: {
    parentId: securityCenterSidebarGroupInjectable.id,
    orderNumber: 60,
  },
  columns: [
    {
      id: "title",
      title: "Title",
      size: "wide",
      value: report => report.getTitle(),
      sortBy: report => report.getTitle(),
      search: report => report.getTitle(),
    },
    {
      id: "version",
      title: "Version",
      size: "narrow",
      value: report => report.spec?.compliance?.version,
    },
    {
      id: "passed",
      title: "Passed",
      size: "narrow",
      value: report => report.getPassCount(),
      sortBy: report => report.getPassCount(),
    },
    {
      id: "failed",
      title: "Failed",
      size: "narrow",
      value: report => (
        <StatusBadge
          tone={report.getFailCount() > 0 ? "error" : "success"}
          label={report.getFailCount()}
        />
      ),
      sortBy: report => report.getFailCount(),
    },
  ],
  details: [
    {
      name: "Title",
      value: report => report.getTitle(),
    },
    {
      name: "Description",
      value: report => report.spec?.compliance?.description,
      hidden: report => !report.spec?.compliance?.description,
    },
    {
      name: "Version",
      value: report => report.spec?.compliance?.version,
      hidden: report => !report.spec?.compliance?.version,
    },
    {
      name: "Platform",
      value: report => report.spec?.compliance?.platform,
      hidden: report => !report.spec?.compliance?.platform,
    },
    {
      name: "Schedule",
      value: report => report.spec?.cron,
      hidden: report => !report.spec?.cron,
    },
    {
      name: "Report type",
      value: report => report.spec?.reportType,
      hidden: report => !report.spec?.reportType,
    },
    {
      name: "Controls",
      value: report => <ComplianceSummary report={report} />,
    },
    {
      name: "Last updated",
      value: report => report.status?.updateTimestamp && <LocaleDate date={report.status.updateTimestamp} />,
      hidden: report => !report.status?.updateTimestamp,
    },
  ],
  DetailsComponent: ComplianceControlsTable,
}));
