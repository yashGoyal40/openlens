/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./security-center.module.scss";

import React from "react";
import type { KubeObjectMetadata, KubeObjectScope } from "@k8slens/kube-object";
import type { AuditCheck, AuditReport } from "../../common/security-center-resources";
import { severityRank, severitySortWeight } from "../../common/severity";
import type { ResourceColumn, ResourceDetail } from "../../../resource-views/renderer/resource-view-definition";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { StatusBadge } from "../../../resource-views/renderer/components/status-badge";
import { SeverityBadge, SeverityBadges } from "./severity-badges";
import { formatReportTarget, ReportTargetLink } from "./report-target-link";
import { reportCommonDetails } from "./report-details";

type AnyAuditReport = AuditReport<KubeObjectMetadata<KubeObjectScope>>;

const byFailedThenSeverity = (left: AuditCheck, right: AuditCheck) => (
  Number(left.success) - Number(right.success)
  || severityRank(left.severity) - severityRank(right.severity)
  || left.checkID.localeCompare(right.checkID)
);

const countChecks = (report: AnyAuditReport) => report.report.checks?.length ?? 0;

const formatCheckCounts = (report: AnyAuditReport) => {
  const failed = report.getFailedChecks().length;

  return `${countChecks(report) - failed} passed, ${failed} failed`;
};

export function getAuditColumns<Report extends AnyAuditReport>(): ResourceColumn<Report>[] {
  return [
    {
      id: "resource",
      title: "Resource",
      size: "wide",
      value: report => <ReportTargetLink report={report} />,
      sortBy: report => formatReportTarget(report.getTarget()),
      search: report => report.getTarget()?.name,
    },
    {
      id: "failed-checks",
      title: "Failed checks",
      size: "wide",
      value: report => (
        <SeverityBadges
          compact
          counts={report.getSeverityCounts()}
          emptyLabel="Passed"
          noun="failed checks" />
      ),
      sortBy: report => severitySortWeight(report.getSeverityCounts()),
    },
    {
      id: "checks",
      title: "Checks",
      size: "narrow",
      value: countChecks,
      sortBy: countChecks,
    },
  ];
}

export function getAuditDetails<Report extends AnyAuditReport>(): ResourceDetail<Report>[] {
  return [
    {
      name: "Resource",
      value: report => <ReportTargetLink report={report} />,
      hidden: report => !report.getTarget(),
    },
    {
      name: "Failed checks",
      value: report => <SeverityBadges counts={report.getSeverityCounts()} noun="failed checks" />,
    },
    {
      name: "Checks",
      value: formatCheckCounts,
      hidden: report => countChecks(report) === 0,
    },
    ...reportCommonDetails<Report>(),
  ];
}

export const AuditChecksTable = ({ object: report }: { object: AnyAuditReport }) => (
  <ResourceTable
    title="Checks"
    rows={report.report.checks?.slice().sort(byFailedThenSeverity)}
    columns={[
      {
        title: "Status",
        className: styles.narrowCell,
        value: check => (
          check.success
            ? <StatusBadge tone="success" label="Pass" />
            : <StatusBadge tone="error" label="Fail" />
        ),
      },
      { title: "Severity", className: styles.narrowCell, value: check => <SeverityBadge severity={check.severity} /> },
      { title: "ID", className: styles.identifier, value: check => check.checkID },
      {
        title: "Title",
        className: styles.wideCell,
        value: check => <span title={[check.description, check.remediation].filter(Boolean).join("\n\n")}>{check.title ?? check.checkID}</span>,
      },
      { title: "Category", value: check => check.category },
      {
        title: "Messages",
        className: styles.wideCell,
        value: check => <span className={styles.messages}>{check.messages?.join("\n")}</span>,
      },
    ]}
  />
);
