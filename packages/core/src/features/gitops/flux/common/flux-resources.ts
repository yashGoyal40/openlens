/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { NamespaceScopedMetadata } from "@k8slens/kube-object";
import { KubeObject } from "@k8slens/kube-object";
import { describeResource } from "../../../resource-views/common/resource-descriptor";
import type { KubeCondition } from "../../../resource-views/common/kube-condition";

export const fluxKustomizeGroup = "kustomize.toolkit.fluxcd.io";
export const fluxHelmGroup = "helm.toolkit.fluxcd.io";
export const fluxSourceGroup = "source.toolkit.fluxcd.io";

export const fluxKustomizationsDescriptor = describeResource({
  id: "gitops-flux-kustomizations",
  kind: "Kustomization",
  group: fluxKustomizeGroup,
  versions: ["v1", "v1beta2"],
  apiName: "kustomizations",
  namespaced: true,
  title: "Kustomizations",
});

export const fluxHelmReleasesDescriptor = describeResource({
  id: "gitops-flux-helm-releases",
  kind: "HelmRelease",
  group: fluxHelmGroup,
  versions: ["v2", "v2beta2", "v2beta1"],
  apiName: "helmreleases",
  namespaced: true,
  title: "Helm Releases",
});

export const fluxGitRepositoriesDescriptor = describeResource({
  id: "gitops-flux-git-repositories",
  kind: "GitRepository",
  group: fluxSourceGroup,
  versions: ["v1", "v1beta2"],
  apiName: "gitrepositories",
  namespaced: true,
  title: "Git Repositories",
});

export const fluxOciRepositoriesDescriptor = describeResource({
  id: "gitops-flux-oci-repositories",
  kind: "OCIRepository",
  group: fluxSourceGroup,
  versions: ["v1", "v1beta2"],
  apiName: "ocirepositories",
  namespaced: true,
  title: "OCI Repositories",
});

export const fluxHelmRepositoriesDescriptor = describeResource({
  id: "gitops-flux-helm-repositories",
  kind: "HelmRepository",
  group: fluxSourceGroup,
  versions: ["v1", "v1beta2"],
  apiName: "helmrepositories",
  namespaced: true,
  title: "Helm Repositories",
});

export const fluxHelmChartsDescriptor = describeResource({
  id: "gitops-flux-helm-charts",
  kind: "HelmChart",
  group: fluxSourceGroup,
  versions: ["v1", "v1beta2"],
  apiName: "helmcharts",
  namespaced: true,
  title: "Helm Charts",
});

export const fluxBucketsDescriptor = describeResource({
  id: "gitops-flux-buckets",
  kind: "Bucket",
  group: fluxSourceGroup,
  versions: ["v1", "v1beta2"],
  apiName: "buckets",
  namespaced: true,
  title: "Buckets",
});

/**
 * A reference to another Flux object, possibly of another kind and in another namespace
 */
export interface FluxCrossNamespaceObjectReference {
  apiVersion?: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface FluxDependencyReference {
  name: string;
  namespace?: string;
}

export interface FluxLocalObjectReference {
  name: string;
}

/**
 * The fields shared by the spec of all Flux objects that are reconciled periodically
 */
export interface FluxReconcilableSpec {
  interval?: string;
  timeout?: string;
  suspend?: boolean;
}

/**
 * The fields shared by the status of all Flux objects
 */
export interface FluxReconcilableStatus {
  conditions?: KubeCondition[];
  observedGeneration?: number;
  lastHandledReconcileAt?: string;
}

export interface FluxArtifact {
  path?: string;
  url?: string;
  revision?: string;
  digest?: string;

  /**
   * @deprecated replaced by `digest` in source.toolkit.fluxcd.io/v1
   */
  checksum?: string;
  lastUpdateTime?: string;
  size?: number;
  metadata?: Record<string, string>;
}

export interface FluxSourceStatus extends FluxReconcilableStatus {
  artifact?: FluxArtifact;

  /**
   * The URL from which the artifact of the source can be downloaded
   */
  url?: string;
}

/**
 * Any Flux object, for helpers shared between all kinds
 */
export type FluxObject = KubeObject<NamespaceScopedMetadata, FluxReconcilableStatus, FluxReconcilableSpec>;

export interface FluxKustomizationSpec extends FluxReconcilableSpec {
  sourceRef: FluxCrossNamespaceObjectReference;
  path?: string;
  prune: boolean;
  retryInterval?: string;
  targetNamespace?: string;
  serviceAccountName?: string;
  dependsOn?: FluxDependencyReference[];
  wait?: boolean;
  force?: boolean;
  components?: string[];
}

export interface FluxInventoryEntry {
  /**
   * Formatted as "<namespace>_<name>_<group>_<kind>"
   */
  id: string;

  /**
   * The version of the resource
   */
  v: string;
}

export interface FluxKustomizationStatus extends FluxReconcilableStatus {
  lastAppliedRevision?: string;
  lastAttemptedRevision?: string;
  inventory?: {
    entries?: FluxInventoryEntry[];
  };
}

export class FluxKustomization extends KubeObject<NamespaceScopedMetadata, FluxKustomizationStatus, FluxKustomizationSpec> {
  static readonly kind = fluxKustomizationsDescriptor.kind;
  static readonly namespaced = fluxKustomizationsDescriptor.namespaced;
  static readonly apiBase = fluxKustomizationsDescriptor.apiBase;
}

export interface FluxHelmChartTemplateSpec {
  chart: string;
  version?: string;
  sourceRef: FluxCrossNamespaceObjectReference;
  interval?: string;
  reconcileStrategy?: string;
  valuesFiles?: string[];
}

export interface FluxValuesReference {
  kind: "Secret" | "ConfigMap" | string;
  name: string;
  valuesKey?: string;
  targetPath?: string;
  optional?: boolean;
}

export interface FluxHelmReleaseSpec extends FluxReconcilableSpec {
  chart?: {
    spec: FluxHelmChartTemplateSpec;
  };

  /**
   * Alternative to `chart`, referencing an OCIRepository or HelmChart (since helm.toolkit.fluxcd.io/v2)
   */
  chartRef?: FluxCrossNamespaceObjectReference;
  releaseName?: string;
  targetNamespace?: string;
  storageNamespace?: string;
  serviceAccountName?: string;
  dependsOn?: FluxDependencyReference[];
  maxHistory?: number;
  valuesFrom?: FluxValuesReference[];
  values?: Record<string, unknown>;
}

/**
 * A Helm release revision, as recorded in `status.history` (since helm.toolkit.fluxcd.io/v2beta2)
 */
export interface FluxHelmReleaseSnapshot {
  name: string;
  namespace: string;
  version: number;
  status: string;
  chartName: string;
  chartVersion: string;
  appVersion?: string;
  digest?: string;
  configDigest?: string;
  firstDeployed?: string;
  lastDeployed?: string;
  deleted?: string;
  ociDigest?: string;
}

export interface FluxHelmReleaseStatus extends FluxReconcilableStatus {
  helmChart?: string;
  lastAttemptedRevision?: string;
  lastAttemptedReleaseAction?: string;
  history?: FluxHelmReleaseSnapshot[];
  storageNamespace?: string;
  failures?: number;
  installFailures?: number;
  upgradeFailures?: number;

  /**
   * Only in helm.toolkit.fluxcd.io/v2beta1
   */
  lastAppliedRevision?: string;
  lastReleaseRevision?: number;
}

export class FluxHelmRelease extends KubeObject<NamespaceScopedMetadata, FluxHelmReleaseStatus, FluxHelmReleaseSpec> {
  static readonly kind = fluxHelmReleasesDescriptor.kind;
  static readonly namespaced = fluxHelmReleasesDescriptor.namespaced;
  static readonly apiBase = fluxHelmReleasesDescriptor.apiBase;
}

export interface FluxGitRepositorySpec extends FluxReconcilableSpec {
  url: string;
  ref?: {
    branch?: string;
    tag?: string;
    semver?: string;
    name?: string;
    commit?: string;
  };
  secretRef?: FluxLocalObjectReference;
  provider?: string;
  recurseSubmodules?: boolean;
  include?: { repository: FluxLocalObjectReference; fromPath?: string; toPath?: string }[];
  verify?: { mode?: string };
  ignore?: string;
}

export class FluxGitRepository extends KubeObject<NamespaceScopedMetadata, FluxSourceStatus, FluxGitRepositorySpec> {
  static readonly kind = fluxGitRepositoriesDescriptor.kind;
  static readonly namespaced = fluxGitRepositoriesDescriptor.namespaced;
  static readonly apiBase = fluxGitRepositoriesDescriptor.apiBase;
}

export interface FluxOciRepositorySpec extends FluxReconcilableSpec {
  url: string;
  ref?: {
    tag?: string;
    semver?: string;
    semverFilter?: string;
    digest?: string;
  };
  layerSelector?: {
    mediaType?: string;
    operation?: string;
  };
  provider?: string;
  secretRef?: FluxLocalObjectReference;
  serviceAccountName?: string;
  insecure?: boolean;
  ignore?: string;
}

export class FluxOciRepository extends KubeObject<NamespaceScopedMetadata, FluxSourceStatus, FluxOciRepositorySpec> {
  static readonly kind = fluxOciRepositoriesDescriptor.kind;
  static readonly namespaced = fluxOciRepositoriesDescriptor.namespaced;
  static readonly apiBase = fluxOciRepositoriesDescriptor.apiBase;
}

export interface FluxHelmRepositorySpec extends FluxReconcilableSpec {
  url: string;
  type?: "default" | "oci" | string;
  provider?: string;
  secretRef?: FluxLocalObjectReference;
  passCredentials?: boolean;
  insecure?: boolean;
}

export class FluxHelmRepository extends KubeObject<NamespaceScopedMetadata, FluxSourceStatus, FluxHelmRepositorySpec> {
  static readonly kind = fluxHelmRepositoriesDescriptor.kind;
  static readonly namespaced = fluxHelmRepositoriesDescriptor.namespaced;
  static readonly apiBase = fluxHelmRepositoriesDescriptor.apiBase;
}

export interface FluxHelmChartSpec extends FluxReconcilableSpec {
  chart: string;
  version?: string;

  /**
   * Always in the namespace of the chart
   */
  sourceRef: FluxCrossNamespaceObjectReference;
  reconcileStrategy?: "ChartVersion" | "Revision" | string;
  valuesFiles?: string[];
}

export interface FluxHelmChartStatus extends FluxSourceStatus {
  observedChartName?: string;
  observedSourceArtifactRevision?: string;
  observedValuesFiles?: string[];
}

export class FluxHelmChart extends KubeObject<NamespaceScopedMetadata, FluxHelmChartStatus, FluxHelmChartSpec> {
  static readonly kind = fluxHelmChartsDescriptor.kind;
  static readonly namespaced = fluxHelmChartsDescriptor.namespaced;
  static readonly apiBase = fluxHelmChartsDescriptor.apiBase;
}

export interface FluxBucketSpec extends FluxReconcilableSpec {
  bucketName: string;
  endpoint: string;
  provider?: "generic" | "aws" | "gcp" | "azure" | string;
  region?: string;
  prefix?: string;
  insecure?: boolean;
  secretRef?: FluxLocalObjectReference;
  ignore?: string;
}

export class FluxBucket extends KubeObject<NamespaceScopedMetadata, FluxSourceStatus, FluxBucketSpec> {
  static readonly kind = fluxBucketsDescriptor.kind;
  static readonly namespaced = fluxBucketsDescriptor.namespaced;
  static readonly apiBase = fluxBucketsDescriptor.apiBase;
}

export type FluxSource = FluxGitRepository | FluxOciRepository | FluxHelmRepository | FluxHelmChart | FluxBucket;
