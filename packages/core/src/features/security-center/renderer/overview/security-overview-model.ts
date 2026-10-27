/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { AuditReport, ExposedSecretReport, ReportTarget, VulnerabilityReport } from "../../common/security-center-resources";
import type { SeverityCounts } from "../../common/severity";
import { addSeverityCounts, compareSeverityCounts, emptySeverityCounts, totalOfSeverityCounts } from "../../common/severity";

export interface WorkloadVulnerabilities {
  key: string;
  target: ReportTarget | undefined;
  namespace: string;
  counts: SeverityCounts;
  images: string[];

  /**
   * The report of one of the containers, used for links
   */
  report: VulnerabilityReport;
}

export interface ImageVulnerabilities {
  image: string;
  counts: SeverityCounts;
  workloads: number;
  report: VulnerabilityReport;
}

export interface NamespaceVulnerabilities {
  namespace: string;
  counts: SeverityCounts;
  reports: number;
}

export interface VulnerabilitiesOverview {
  totals: SeverityCounts;
  reports: number;
  workloads: WorkloadVulnerabilities[];
  images: ImageVulnerabilities[];
  namespaces: NamespaceVulnerabilities[];
}

const byWorstFirst = <T extends { counts: SeverityCounts }>(left: T, right: T) => compareSeverityCounts(left.counts, right.counts);

const getWorkloadKey = (report: VulnerabilityReport) => {
  const target = report.getTarget();

  return target
    ? `${target.namespace ?? report.getNs()}/${target.kind}/${target.name}`
    : `${report.getNs()}/${report.getName()}`;
};

/**
 * Groups the reports, which trivy creates per container, by workload, image and namespace. All lists are sorted worst first.
 */
export const summarizeVulnerabilityReports = (reports: VulnerabilityReport[]): VulnerabilitiesOverview => {
  const workloads = new Map<string, WorkloadVulnerabilities>();
  const images = new Map<string, ImageVulnerabilities & { workloadKeys: Set<string> }>();
  const namespaces = new Map<string, NamespaceVulnerabilities>();

  for (const report of reports) {
    const counts = report.getSeverityCounts();
    const workloadKey = getWorkloadKey(report);
    const image = report.getFullImage() || report.getName();
    const namespace = report.getNs();

    const workload = workloads.get(workloadKey);

    if (workload) {
      workload.counts = addSeverityCounts(workload.counts, counts);
      workload.images = [...new Set([...workload.images, image])];
    } else {
      workloads.set(workloadKey, {
        key: workloadKey,
        target: report.getTarget(),
        namespace,
        counts,
        images: [image],
        report,
      });
    }

    const imageSummary = images.get(image);

    // the same image is scanned once per workload using it, so its counts are not summed up
    if (imageSummary) {
      imageSummary.workloadKeys.add(workloadKey);

      if (compareSeverityCounts(counts, imageSummary.counts) < 0) {
        imageSummary.counts = counts;
        imageSummary.report = report;
      }
    } else {
      images.set(image, {
        image,
        counts,
        workloads: 0,
        workloadKeys: new Set([workloadKey]),
        report,
      });
    }

    const namespaceSummary = namespaces.get(namespace);

    if (namespaceSummary) {
      namespaceSummary.counts = addSeverityCounts(namespaceSummary.counts, counts);
      namespaceSummary.reports += 1;
    } else {
      namespaces.set(namespace, { namespace, counts, reports: 1 });
    }
  }

  return {
    totals: addSeverityCounts(...reports.map(report => report.getSeverityCounts())),
    reports: reports.length,
    workloads: [...workloads.values()].sort(byWorstFirst),
    images: [...images.values()]
      .map(({ workloadKeys, ...summary }) => ({ ...summary, workloads: workloadKeys.size }))
      .sort(byWorstFirst),
    namespaces: [...namespaces.values()].sort(byWorstFirst),
  };
};

export interface AuditOverview {
  failedChecks: SeverityCounts;
  resources: number;
  failingResources: number;
}

export const summarizeAuditReports = (reports: AuditReport[]): AuditOverview => {
  const perReport = reports.map(report => report.getSeverityCounts());

  return {
    failedChecks: addSeverityCounts(emptySeverityCounts(), ...perReport),
    resources: reports.length,
    failingResources: perReport.filter(counts => totalOfSeverityCounts(counts) > 0).length,
  };
};

export interface ExposedSecretsOverview {
  secrets: number;
  counts: SeverityCounts;
  affectedImages: number;
}

export const summarizeExposedSecretReports = (reports: ExposedSecretReport[]): ExposedSecretsOverview => {
  const affected = reports.filter(report => totalOfSeverityCounts(report.getSeverityCounts()) > 0 || report.getSecretsCount() > 0);
  const counts = addSeverityCounts(emptySeverityCounts(), ...reports.map(report => report.getSeverityCounts()));

  return {
    secrets: Math.max(totalOfSeverityCounts(counts), reports.reduce((total, report) => total + report.getSecretsCount(), 0)),
    counts,
    affectedImages: new Set(affected.map(report => report.getFullImage() || report.getName())).size,
  };
};
