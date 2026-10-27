/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { AnyTrivyReport, ReportScanner } from "../../common/security-center-resources";
import type { ResourceDetail } from "../../../resource-views/renderer/resource-view-definition";
import { LocaleDate } from "../../../../renderer/components/locale-date";

export const formatScanner = (scanner: ReportScanner | undefined) => (
  [scanner?.name, scanner?.version].filter(Boolean).join(" ")
);

/**
 * Details shown for every kind of trivy report
 */
export function reportCommonDetails<Report extends AnyTrivyReport>(): ResourceDetail<Report>[] {
  return [
    {
      name: "Scanner",
      value: report => formatScanner(report.report.scanner),
      hidden: report => !formatScanner(report.report.scanner),
    },
    {
      name: "Last scanned",
      value: report => report.report.updateTimestamp && <LocaleDate date={report.report.updateTimestamp} />,
      hidden: report => !report.report.updateTimestamp,
    },
  ];
}
