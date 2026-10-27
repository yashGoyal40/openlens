/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ClusterScopedMetadata, KubeJsonApiData, KubeObjectMetadata, KubeObjectScope, NamespaceScopedMetadata } from "@k8slens/kube-object";
import { KubeObject } from "@k8slens/kube-object";
import { describeResource } from "../../resource-views/common/resource-descriptor";
import type { SeveritySummary } from "./severity";
import { countBySeverity, severityCountsFromSummary } from "./severity";

export const trivyOperatorGroup = "aquasecurity.github.io";

export const vulnerabilityReportsDescriptor = describeResource({
  id: "security-center-vulnerability-reports",
  kind: "VulnerabilityReport",
  group: trivyOperatorGroup,
  versions: ["v1alpha1"],
  apiName: "vulnerabilityreports",
  namespaced: true,
  title: "Vulnerability Reports",
});

export const exposedSecretReportsDescriptor = describeResource({
  id: "security-center-exposed-secret-reports",
  kind: "ExposedSecretReport",
  group: trivyOperatorGroup,
  versions: ["v1alpha1"],
  apiName: "exposedsecretreports",
  namespaced: true,
  title: "Exposed Secrets",
});

export const configAuditReportsDescriptor = describeResource({
  id: "security-center-config-audit-reports",
  kind: "ConfigAuditReport",
  group: trivyOperatorGroup,
  versions: ["v1alpha1"],
  apiName: "configauditreports",
  namespaced: true,
  title: "Config Audits",
});

export const rbacAssessmentReportsDescriptor = describeResource({
  id: "security-center-rbac-assessment-reports",
  kind: "RbacAssessmentReport",
  group: trivyOperatorGroup,
  versions: ["v1alpha1"],
  apiName: "rbacassessmentreports",
  namespaced: true,
  title: "RBAC Assessments",
});

export const clusterRbacAssessmentReportsDescriptor = describeResource({
  id: "security-center-cluster-rbac-assessment-reports",
  kind: "ClusterRbacAssessmentReport",
  group: trivyOperatorGroup,
  versions: ["v1alpha1"],
  apiName: "clusterrbacassessmentreports",
  namespaced: false,
  title: "Cluster RBAC Assessments",
});

export const infraAssessmentReportsDescriptor = describeResource({
  id: "security-center-infra-assessment-reports",
  kind: "InfraAssessmentReport",
  group: trivyOperatorGroup,
  versions: ["v1alpha1"],
  apiName: "infraassessmentreports",
  namespaced: true,
  title: "Infra Assessments",
});

export const clusterComplianceReportsDescriptor = describeResource({
  id: "security-center-cluster-compliance-reports",
  kind: "ClusterComplianceReport",
  group: trivyOperatorGroup,
  versions: ["v1alpha1"],
  apiName: "clustercompliancereports",
  namespaced: false,
  title: "Compliance",
});

/**
 * Labels trivy-operator puts on every report to identify the scanned resource
 */
export const trivyOperatorLabels = {
  resourceKind: "trivy-operator.resource.kind",
  resourceName: "trivy-operator.resource.name",
  resourceNamespace: "trivy-operator.resource.namespace",
  containerName: "trivy-operator.container.name",
} as const;

export interface ReportTarget {
  kind: string;
  name: string;

  /**
   * Empty for cluster scoped resources
   */
  namespace?: string;
}

export interface ReportScanner {
  name?: string;
  vendor?: string;
  version?: string;
}

export interface ReportArtifact {
  repository?: string;
  tag?: string;
  digest?: string;
  mimeType?: string;
}

export interface ReportRegistry {
  server?: string;
}

export interface CommonReport {
  updateTimestamp?: string;
  scanner?: ReportScanner;
  summary?: SeveritySummary;
}

export interface ImageReport extends CommonReport {
  artifact?: ReportArtifact;
  registry?: ReportRegistry;
}

export interface TrivyReportData<Metadata extends KubeObjectMetadata<KubeObjectScope>, Report> extends KubeJsonApiData<Metadata, void, void> {
  report?: Report;
}

/**
 * Trivy keeps the results in a top-level `report` field instead of `spec` or `status`
 */
export class TrivyReport<
  Report extends CommonReport = CommonReport,
  Metadata extends KubeObjectMetadata<KubeObjectScope> = NamespaceScopedMetadata,
> extends KubeObject<Metadata, void, void> {
  report: Report;

  constructor({ report, ...rest }: TrivyReportData<Metadata, Report>) {
    super(rest);
    this.report = report ?? {} as Report;
  }

  /**
   * The scanned resource, the name is kept in an annotation when it is too long for a label
   */
  getTarget(): ReportTarget | undefined {
    const labels = this.metadata.labels ?? {};
    const kind = labels[trivyOperatorLabels.resourceKind];
    const name = labels[trivyOperatorLabels.resourceName] ?? this.metadata.annotations?.[trivyOperatorLabels.resourceName];

    if (!kind || !name) {
      return undefined;
    }

    return {
      kind,
      name,
      namespace: labels[trivyOperatorLabels.resourceNamespace] || undefined,
    };
  }

  getContainerName(): string | undefined {
    return this.metadata.labels?.[trivyOperatorLabels.containerName];
  }

  getSeverityCounts() {
    return severityCountsFromSummary(this.report.summary);
  }
}

export type AnyTrivyReport = TrivyReport<CommonReport, KubeObjectMetadata<KubeObjectScope>>;

/**
 * The image as shown in lists, e.g. "library/nginx:1.25"
 */
export const formatImage = (artifact: ReportArtifact | undefined, registry?: ReportRegistry) => {
  if (!artifact?.repository) {
    return "";
  }

  const repository = registry?.server
    ? `${registry.server}/${artifact.repository}`
    : artifact.repository;

  if (artifact.tag) {
    return `${repository}:${artifact.tag}`;
  }

  return artifact.digest
    ? `${repository}@${artifact.digest}`
    : repository;
};

export class ImageReportBase<Report extends ImageReport> extends TrivyReport<Report> {
  getImage() {
    return formatImage(this.report.artifact);
  }

  getFullImage() {
    const image = formatImage(this.report.artifact, this.report.registry);
    const { tag, digest } = this.report.artifact ?? {};

    return tag && digest
      ? `${image}@${digest}`
      : image;
  }
}

export interface Vulnerability {
  vulnerabilityID: string;
  resource: string;
  installedVersion: string;
  fixedVersion?: string;
  severity: string;
  title?: string;
  description?: string;
  primaryLink?: string;
  links?: string[];
  score?: number;
  target?: string;
  class?: string;
  packageType?: string;
  publishedDate?: string;
  lastModifiedDate?: string;
}

export interface VulnerabilityReportContent extends ImageReport {
  os?: {
    family?: string;
    name?: string;
    eosl?: boolean;
  };
  vulnerabilities?: Vulnerability[];
}

export class VulnerabilityReport extends ImageReportBase<VulnerabilityReportContent> {
  static readonly kind = vulnerabilityReportsDescriptor.kind;
  static readonly namespaced = vulnerabilityReportsDescriptor.namespaced;
  static readonly apiBase = vulnerabilityReportsDescriptor.apiBase;

  getSeverityCounts() {
    return this.report.summary
      ? severityCountsFromSummary(this.report.summary)
      : countBySeverity(this.report.vulnerabilities ?? []);
  }

  getFixableCount() {
    return this.report.vulnerabilities?.filter(vulnerability => vulnerability.fixedVersion).length ?? 0;
  }
}

export interface ExposedSecret {
  target?: string;
  ruleID: string;
  title?: string;
  category?: string;
  severity: string;
  match?: string;
}

export interface ExposedSecretReportContent extends ImageReport {
  secrets?: ExposedSecret[];
}

export class ExposedSecretReport extends ImageReportBase<ExposedSecretReportContent> {
  static readonly kind = exposedSecretReportsDescriptor.kind;
  static readonly namespaced = exposedSecretReportsDescriptor.namespaced;
  static readonly apiBase = exposedSecretReportsDescriptor.apiBase;

  getSeverityCounts() {
    return this.report.summary
      ? severityCountsFromSummary(this.report.summary)
      : countBySeverity(this.report.secrets ?? []);
  }

  getSecretsCount() {
    return this.report.secrets?.length ?? 0;
  }
}

export interface AuditCheck {
  checkID: string;
  title?: string;
  description?: string;
  severity: string;
  category?: string;
  success: boolean;
  messages?: string[];
  remediation?: string;
  scope?: {
    type: string;
    value: string;
  };
}

export interface AuditReportContent extends CommonReport {
  checks?: AuditCheck[];
}

/**
 * Config audit, RBAC and infra assessment reports share the same shape
 */
export class AuditReport<Metadata extends KubeObjectMetadata<KubeObjectScope> = NamespaceScopedMetadata> extends TrivyReport<AuditReportContent, Metadata> {
  getFailedChecks() {
    return this.report.checks?.filter(check => !check.success) ?? [];
  }

  /**
   * The summary only counts failed checks
   */
  getSeverityCounts() {
    return this.report.summary
      ? severityCountsFromSummary(this.report.summary)
      : countBySeverity(this.getFailedChecks());
  }
}

export class ConfigAuditReport extends AuditReport {
  static readonly kind = configAuditReportsDescriptor.kind;
  static readonly namespaced = configAuditReportsDescriptor.namespaced;
  static readonly apiBase = configAuditReportsDescriptor.apiBase;
}

export class RbacAssessmentReport extends AuditReport {
  static readonly kind = rbacAssessmentReportsDescriptor.kind;
  static readonly namespaced = rbacAssessmentReportsDescriptor.namespaced;
  static readonly apiBase = rbacAssessmentReportsDescriptor.apiBase;
}

export class ClusterRbacAssessmentReport extends AuditReport<ClusterScopedMetadata> {
  static readonly kind = clusterRbacAssessmentReportsDescriptor.kind;
  static readonly namespaced = clusterRbacAssessmentReportsDescriptor.namespaced;
  static readonly apiBase = clusterRbacAssessmentReportsDescriptor.apiBase;
}

export class InfraAssessmentReport extends AuditReport {
  static readonly kind = infraAssessmentReportsDescriptor.kind;
  static readonly namespaced = infraAssessmentReportsDescriptor.namespaced;
  static readonly apiBase = infraAssessmentReportsDescriptor.apiBase;
}

export interface ComplianceControl {
  id: string;
  name: string;
  description?: string;
  severity: string;
  checks?: { id: string }[];
  defaultStatus?: string;
}

export interface ClusterComplianceReportSpec {
  cron?: string;
  reportType?: "summary" | "all" | string;
  compliance: {
    id: string;
    title: string;
    description?: string;
    version?: string;
    platform?: string;
    type?: string;
    relatedResources?: string[];
    controls?: ComplianceControl[];
  };
}

export interface ComplianceControlCheck {
  id: string;
  name?: string;
  severity?: string;
  totalFail?: number;
}

export interface ClusterComplianceReportStatus {
  updateTimestamp?: string;
  summary?: {
    passCount?: number;
    failCount?: number;
  };
  summaryReport?: {
    id?: string;
    title?: string;
    controlCheck?: ComplianceControlCheck[];
  };

  /**
   * Only filled when `spec.reportType` is "all"
   */
  detailReport?: {
    id?: string;
    title?: string;
    results?: {
      id: string;
      name?: string;
      severity?: string;
      checks?: { checkID: string; success: boolean }[];
    }[];
  };
}

export class ClusterComplianceReport extends KubeObject<ClusterScopedMetadata, ClusterComplianceReportStatus, ClusterComplianceReportSpec> {
  static readonly kind = clusterComplianceReportsDescriptor.kind;
  static readonly namespaced = clusterComplianceReportsDescriptor.namespaced;
  static readonly apiBase = clusterComplianceReportsDescriptor.apiBase;

  getTitle() {
    return this.spec?.compliance?.title ?? this.getName();
  }

  getPassCount() {
    return this.status?.summary?.passCount ?? 0;
  }

  getFailCount() {
    return this.status?.summary?.failCount ?? 0;
  }

  /**
   * The number of failures per control id, from whichever of the summary and detail reports is present
   */
  getControlFailures(): Map<string, number> {
    const failures = new Map<string, number>();

    for (const check of this.status?.summaryReport?.controlCheck ?? []) {
      failures.set(check.id, check.totalFail ?? 0);
    }

    for (const result of this.status?.detailReport?.results ?? []) {
      if (!failures.has(result.id)) {
        failures.set(result.id, result.checks?.filter(check => !check.success).length ?? 0);
      }
    }

    return failures;
  }
}
