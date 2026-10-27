/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { KubeObject } from "@k8slens/kube-object";

// Kubernetes recommended labels, see https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
export const instanceLabel = "app.kubernetes.io/instance";
export const nameLabel = "app.kubernetes.io/name";
export const versionLabel = "app.kubernetes.io/version";
export const managedByLabel = "app.kubernetes.io/managed-by";
export const legacyAppLabel = "app";

export const helmChartLabel = "helm.sh/chart";
export const helmReleaseNameAnnotation = "meta.helm.sh/release-name";
export const argoCdInstanceLabel = "argocd.argoproj.io/instance";
export const argoCdTrackingIdAnnotation = "argocd.argoproj.io/tracking-id";
export const fluxKustomizationLabel = "kustomize.toolkit.fluxcd.io/name";
export const fluxHelmReleaseLabel = "helm.toolkit.fluxcd.io/name";

type Metadata = KubeObject["metadata"];

const getLabel = (metadata: Metadata, key: string) => metadata.labels?.[key]?.trim() || undefined;
const getAnnotation = (metadata: Metadata, key: string) => metadata.annotations?.[key]?.trim() || undefined;

export interface ApplicationIdentity {
  name: string;

  /**
   * Human readable description of where the name came from, e.g. "label app.kubernetes.io/instance"
   */
  source: string;
}

interface IdentityRule {
  source: string;
  get: (metadata: Metadata) => string | undefined;
}

/**
 * In order of preference: the instance label names one installation of an application, which is
 * what users think of as "the application", the other labels and annotations are fallbacks.
 */
const identityRules: IdentityRule[] = [
  { source: `label ${instanceLabel}`, get: metadata => getLabel(metadata, instanceLabel) },
  { source: `label ${nameLabel}`, get: metadata => getLabel(metadata, nameLabel) },
  { source: `label ${legacyAppLabel}`, get: metadata => getLabel(metadata, legacyAppLabel) },
  { source: `annotation ${helmReleaseNameAnnotation}`, get: metadata => getAnnotation(metadata, helmReleaseNameAnnotation) },
  { source: `label ${argoCdInstanceLabel}`, get: metadata => getLabel(metadata, argoCdInstanceLabel) },
];

export const workloadNameIdentitySource = "workload name";

/**
 * Workloads that declare none of the identity labels form an application of their own, named
 * after the workload, so that the applications view still shows everything that runs.
 */
export const getApplicationIdentity = (workload: KubeObject): ApplicationIdentity => {
  for (const { source, get } of identityRules) {
    const name = get(workload.metadata);

    if (name) {
      return { name, source };
    }
  }

  return { name: workload.getName(), source: workloadNameIdentitySource };
};

/**
 * The `helm.sh/chart` label is `<chart name>-<chart version>`, where the name may itself contain
 * dashes and digits. Helm replaces the `+` of semver build metadata with `_` in label values.
 */
const chartVersionPattern = /^.+?-(v?\d+\.\d+[\w.-]*)$/;

export const getChartVersion = (chart: string | undefined) => chart?.match(chartVersionPattern)?.[1];

export const getWorkloadVersion = (workload: KubeObject) => (
  getLabel(workload.metadata, versionLabel)
  ?? getChartVersion(getLabel(workload.metadata, helmChartLabel))
);

const knownManagers: Partial<Record<string, string>> = {
  helm: "Helm",
  tiller: "Helm",
  argocd: "Argo CD",
  "argo-cd": "Argo CD",
  flux: "Flux",
  fluxcd: "Flux",
};

/**
 * GitOps controllers are recognised first, as charts they install still declare Helm in the
 * `app.kubernetes.io/managed-by` label.
 */
export const getWorkloadManager = (workload: KubeObject): string | undefined => {
  const { metadata } = workload;

  if (getLabel(metadata, argoCdInstanceLabel) || getAnnotation(metadata, argoCdTrackingIdAnnotation)) {
    return "Argo CD";
  }

  if (getLabel(metadata, fluxKustomizationLabel) || getLabel(metadata, fluxHelmReleaseLabel)) {
    return "Flux";
  }

  const managedBy = getLabel(metadata, managedByLabel);

  if (managedBy) {
    return knownManagers[managedBy.toLowerCase()] ?? managedBy;
  }

  if (getAnnotation(metadata, helmReleaseNameAnnotation)) {
    return "Helm";
  }

  return undefined;
};
