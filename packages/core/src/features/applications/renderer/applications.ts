/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { CronJob, DaemonSet, Deployment, Job, StatefulSet } from "@k8slens/kube-object";
import { getApplicationIdentity, getWorkloadManager, getWorkloadVersion } from "./application-labels";
import type { ApplicationHealth, ReplicaCount, WorkloadStatus } from "./workload-status";
import { getCronJobStatus, getDaemonSetStatus, getDeploymentStatus, getJobStatus, getStatefulSetStatus, worstHealth } from "./workload-status";

export type ApplicationWorkloadObject = Deployment | StatefulSet | DaemonSet | Job | CronJob;

export interface ApplicationWorkload {
  object: ApplicationWorkloadObject;
  status: WorkloadStatus;

  /**
   * The labels of the pods the workload creates, which services select
   */
  podLabels: Partial<Record<string, string>>;
}

export interface ApplicationStatus {
  health: ApplicationHealth;

  /**
   * Summed over the workloads that keep pods running
   */
  replicas: ReplicaCount;

  /**
   * e.g. "3/4 replicas ready, 1 failed job"
   */
  description: string;
}

export interface Application {
  getId: () => string;
  getName: () => string;
  getNs: () => string;
  readonly name: string;
  readonly namespace: string;

  /**
   * Distinct descriptions of how the workloads were grouped, e.g. "label app.kubernetes.io/instance"
   */
  readonly identitySources: string[];
  readonly workloads: ApplicationWorkload[];
  readonly versions: string[];
  readonly managers: string[];
  readonly status: ApplicationStatus;

  /**
   * The application is as old as its oldest workload
   */
  readonly oldestWorkload: ApplicationWorkloadObject;
}

export interface ApplicationReference {
  namespace: string;
  name: string;
}

export const findApplication = (applications: Application[], { namespace, name }: ApplicationReference) => (
  applications.find(application => application.namespace === namespace && application.name === name)
);

export interface WorkloadsByKind {
  deployments: Deployment[];
  statefulSets: StatefulSet[];
  daemonSets: DaemonSet[];
  jobs: Job[];
  cronJobs: CronJob[];
}

const isOwnedByCronJob = (job: Job) => job.getOwnerRefs().some(ref => ref.kind === "CronJob");

const isJobOf = (cronJob: CronJob) => (job: Job) => (
  job.getNs() === cronJob.getNs()
  && job.getOwnerRefs().some(ref => ref.kind === "CronJob" && ref.name === cronJob.getName())
);

const getLastJobOf = (cronJob: CronJob, jobs: Job[]) => (
  jobs
    .filter(isJobOf(cronJob))
    .reduce<Job | undefined>((last, job) => (
      !last || job.getCreationTimestamp() > last.getCreationTimestamp() ? job : last
    ), undefined)
);

/**
 * Jobs created by a CronJob belong to that CronJob, so they are not workloads of their own
 */
export const toApplicationWorkloads = (workloads: WorkloadsByKind): ApplicationWorkload[] => [
  ...workloads.deployments.map(deployment => ({
    object: deployment,
    status: getDeploymentStatus(deployment),
    podLabels: deployment.spec.template.metadata.labels ?? {},
  })),
  ...workloads.statefulSets.map(statefulSet => ({
    object: statefulSet,
    status: getStatefulSetStatus(statefulSet),
    podLabels: statefulSet.spec.template.metadata?.labels ?? {},
  })),
  ...workloads.daemonSets.map(daemonSet => ({
    object: daemonSet,
    status: getDaemonSetStatus(daemonSet),
    podLabels: daemonSet.spec.template.metadata?.labels ?? {},
  })),
  ...workloads.jobs
    .filter(job => !isOwnedByCronJob(job))
    .map(job => ({
      object: job,
      status: getJobStatus(job),
      podLabels: job.spec.template.metadata?.labels ?? {},
    })),
  ...workloads.cronJobs.map(cronJob => ({
    object: cronJob,
    status: getCronJobStatus(cronJob, getLastJobOf(cronJob, workloads.jobs)),
    podLabels: cronJob.spec.jobTemplate?.spec?.template.metadata?.labels ?? {},
  })),
];

const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))];

const describeStatus = (workloads: ApplicationWorkload[]): ApplicationStatus => {
  const replicas = workloads.reduce<ReplicaCount>((sum, { status }) => ({
    ready: sum.ready + (status.replicas?.ready ?? 0),
    desired: sum.desired + (status.replicas?.desired ?? 0),
  }), { ready: 0, desired: 0 });
  const failedJobs = workloads.filter(({ object, status }) => (
    (object.kind === "Job" || object.kind === "CronJob") && status.health === "Degraded"
  )).length;
  const hasReplicas = workloads.some(({ status }) => status.replicas);

  return {
    health: worstHealth(workloads.map(({ status }) => status.health)),
    replicas,
    description: [
      hasReplicas && `${replicas.ready}/${replicas.desired} replicas ready`,
      failedJobs > 0 && `${failedJobs} failed ${failedJobs === 1 ? "job" : "jobs"}`,
    ].filter(Boolean).join(", "),
  };
};

const kindOrder = ["Deployment", "StatefulSet", "DaemonSet", "CronJob", "Job"];

const byKindThenName = (left: ApplicationWorkload, right: ApplicationWorkload) => (
  kindOrder.indexOf(left.object.kind) - kindOrder.indexOf(right.object.kind)
  || left.object.getName().localeCompare(right.object.getName())
);

const toApplication = (namespace: string, name: string, workloads: ApplicationWorkload[], identitySources: string[]): Application => {
  const sortedWorkloads = [...workloads].sort(byKindThenName);
  const oldestWorkload = sortedWorkloads
    .map(({ object }) => object)
    .reduce((oldest, object) => object.getCreationTimestamp() < oldest.getCreationTimestamp() ? object : oldest);
  const id = `${namespace}/${name}`;

  return {
    getId: () => id,
    getName: () => name,
    getNs: () => namespace,
    name,
    namespace,
    identitySources: distinct(identitySources),
    workloads: sortedWorkloads,
    versions: distinct(sortedWorkloads.map(({ object }) => getWorkloadVersion(object))),
    managers: distinct(sortedWorkloads.map(({ object }) => getWorkloadManager(object))),
    status: describeStatus(sortedWorkloads),
    oldestWorkload,
  };
};

/**
 * Groups the workloads of each namespace by the application they declare to be part of
 */
export const groupApplications = (workloads: WorkloadsByKind): Application[] => {
  const groups = new Map<string, { namespace: string; name: string; workloads: ApplicationWorkload[]; identitySources: string[] }>();

  for (const workload of toApplicationWorkloads(workloads)) {
    const namespace = workload.object.getNs() ?? "";
    const identity = getApplicationIdentity(workload.object);
    const key = `${namespace}/${identity.name}`;
    let group = groups.get(key);

    if (!group) {
      group = { namespace, name: identity.name, workloads: [], identitySources: [] };
      groups.set(key, group);
    }

    group.workloads.push(workload);
    group.identitySources.push(identity.source);
  }

  return [...groups.values()]
    .map(group => toApplication(group.namespace, group.name, group.workloads, group.identitySources))
    .sort((left, right) => left.name.localeCompare(right.name) || left.namespace.localeCompare(right.namespace));
};
