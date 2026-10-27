/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { Job, KubeObject, ReplicaSet } from "@k8slens/kube-object";
import { Deployment } from "@k8slens/kube-object";
import type { ReportTarget, VulnerabilityReport } from "../../common/security-center-resources";

const deploymentRevisionAnnotation = "deployment.kubernetes.io/revision";

export interface ReportOwnerLookups {
  getReplicaSetsOf: (deployment: Deployment) => ReplicaSet[];
  getJob: (name: string, namespace: string) => Job | undefined;
}

export const getController = (object: KubeObject) => {
  const ownerRefs = object.getOwnerRefs();

  return ownerRefs.find(ownerRef => ownerRef.controller) ?? ownerRefs[0];
};

const toTarget = (object: KubeObject): ReportTarget => ({
  kind: object.kind,
  name: object.getName(),
  namespace: object.getNs(),
});

const getRevision = (object: KubeObject) => Number(object.metadata.annotations?.[deploymentRevisionAnnotation] ?? 0);

/**
 * The ReplicaSet of the current revision, falling back to those running pods and then to the newest one
 */
const getCurrentReplicaSets = (deployment: Deployment, lookups: ReportOwnerLookups) => {
  const replicaSets = lookups.getReplicaSetsOf(deployment);
  const revision = getRevision(deployment);
  const current = replicaSets.filter(replicaSet => revision > 0 && getRevision(replicaSet) === revision);

  if (current.length > 0) {
    return current;
  }

  const active = replicaSets.filter(replicaSet => (replicaSet.status?.replicas ?? 0) > 0);

  if (active.length > 0) {
    return active;
  }

  return replicaSets
    .slice()
    .sort((left, right) => getRevision(right) - getRevision(left))
    .slice(0, 1);
};

/**
 * The resources trivy-operator files the reports of the object's containers under. It scans the
 * controllers rather than their pods: the current ReplicaSet of a Deployment, the CronJob of a Job
 * and the owner of a Pod.
 */
export const getReportOwners = (object: KubeObject, lookups: ReportOwnerLookups): ReportTarget[] => {
  const namespace = object.getNs();

  if (object instanceof Deployment) {
    return getCurrentReplicaSets(object, lookups).map(toTarget);
  }

  const controller = getController(object);

  switch (object.kind) {
    case "Pod": {
      if (!controller) {
        return [toTarget(object)];
      }

      if (controller.kind === "Job") {
        const job = lookups.getJob(controller.name, namespace ?? "");

        return job
          ? getReportOwners(job, lookups)
          : [{ kind: "Job", name: controller.name, namespace }];
      }

      // pods of other controllers are reported on their own
      return [{ kind: controller.kind, name: controller.name, namespace }, toTarget(object)];
    }

    case "Job":
      return controller?.kind === "CronJob"
        ? [{ kind: "CronJob", name: controller.name, namespace }]
        : [toTarget(object)];

    default:
      return [toTarget(object)];
  }
};

export const isReportOf = (report: VulnerabilityReport, owners: ReportTarget[]) => {
  const target = report.getTarget();

  return Boolean(target) && owners.some(owner => (
    owner.kind === target?.kind
    && owner.name === target.name
    && (owner.namespace ?? "") === (target.namespace ?? report.getNs() ?? "")
  ));
};
