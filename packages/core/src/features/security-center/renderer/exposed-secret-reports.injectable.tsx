/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./components/security-center.module.scss";

import React from "react";
import { ExposedSecretReport, exposedSecretReportsDescriptor } from "../common/security-center-resources";
import { exposedSecretReportsRoutes } from "../common/security-center-routes.injectable";
import { bySeverity, severitySortWeight } from "../common/severity";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { SeverityBadge, SeverityBadges } from "./components/severity-badges";
import { formatReportTarget, ReportTargetLink } from "./components/report-target-link";
import { reportCommonDetails } from "./components/report-details";
import securityCenterSidebarGroupInjectable from "./security-center-sidebar-group.injectable";

const ExposedSecretsTable = ({ object: report }: { object: ExposedSecretReport }) => (
  <ResourceTable
    title="Secrets"
    rows={report.report.secrets?.slice().sort(bySeverity)}
    columns={[
      { title: "Severity", className: styles.narrowCell, value: secret => <SeverityBadge severity={secret.severity} /> },
      { title: "Rule", className: styles.identifier, value: secret => secret.ruleID },
      { title: "Category", value: secret => secret.category },
      { title: "Title", value: secret => secret.title },
      { title: "File", className: styles.identifier, value: secret => secret.target },
      { title: "Match", className: styles.wideCell, value: secret => <span className={styles.identifier}>{secret.match}</span> },
    ]}
  />
);

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ExposedSecretReport>({
  descriptor: exposedSecretReportsDescriptor,
  objectConstructor: ExposedSecretReport,
  routes: exposedSecretReportsRoutes,
  sidebar: {
    parentId: securityCenterSidebarGroupInjectable.id,
    orderNumber: 20,
  },
  columns: [
    {
      id: "resource",
      title: "Resource",
      size: "wide",
      value: report => <ReportTargetLink report={report} />,
      sortBy: report => formatReportTarget(report.getTarget()),
      search: report => report.getTarget()?.name,
    },
    {
      id: "container",
      title: "Container",
      value: report => report.getContainerName(),
      sortBy: report => report.getContainerName(),
      search: report => report.getContainerName(),
    },
    {
      id: "image",
      title: "Image",
      size: "wide",
      value: report => report.getImage(),
      sortBy: report => report.getImage(),
      search: report => report.getFullImage(),
    },
    {
      id: "secrets",
      title: "Secrets",
      size: "wide",
      value: report => (
        <SeverityBadges
          compact
          counts={report.getSeverityCounts()}
          noun="secrets" />
      ),
      sortBy: report => severitySortWeight(report.getSeverityCounts()),
    },
  ],
  details: [
    {
      name: "Resource",
      value: report => <ReportTargetLink report={report} />,
      hidden: report => !report.getTarget(),
    },
    {
      name: "Container",
      value: report => report.getContainerName(),
      hidden: report => !report.getContainerName(),
    },
    {
      name: "Image",
      value: report => <span className={styles.identifier}>{report.getFullImage()}</span>,
    },
    {
      name: "Secrets",
      value: report => <SeverityBadges counts={report.getSeverityCounts()} noun="secrets" />,
    },
    ...reportCommonDetails<ExposedSecretReport>(),
  ],
  DetailsComponent: ExposedSecretsTable,
}));
