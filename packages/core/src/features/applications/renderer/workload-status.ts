/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { BaseKubeObjectCondition, CronJob, DaemonSet, Deployment, Job, StatefulSet } from "@k8slens/kube-object";

export type ApplicationHealth = "Healthy" | "Progressing" | "Degraded";

const healthSeverity: Record<ApplicationHealth, number> = {
  Healthy: 0,
  Progressing: 1,
  Degraded: 2,
};

export const getHealthSeverity = (health: ApplicationHealth) => healthSeverity[health];

export const worstHealth = (healths: ApplicationHealth[]): ApplicationHealth => (
  healths.reduce<ApplicationHealth>((worst, health) => healthSeverity[health] > healthSeverity[worst] ? health : worst, "Healthy")
);

export interface ReplicaCount {
  ready: number;
  desired: number;
}

export interface WorkloadStatus {
  health: ApplicationHealth;

  /**
   * Ready vs desired pods, only for workloads that keep pods running
   */
  replicas?: ReplicaCount;

  /**
   * Short description of the state, e.g. "2/3 ready" or "Job failed"
   */
  description: string;
}

const hasCondition = (conditions: BaseKubeObjectCondition[] | undefined, type: string, status: BaseKubeObjectCondition["status"]) => (
  conditions?.find(condition => condition.type === type && condition.status === status)
);

/**
 * Workloads created moments ago have no ready pods yet only because their pods are still starting
 */
const startupGracePeriodMs = 5 * 60 * 1000;

const isStartingUp = (workload: Deployment | StatefulSet | DaemonSet) => (
  Date.now() - workload.getCreationTimestamp() < startupGracePeriodMs
);

/**
 * No ready pods while some are wanted means the workload is not serving at all, unless it was just
 * created or is rolling out. Fewer ready pods than wanted (or pods still running an older template)
 * means it is starting or rolling out.
 */
const fromReplicas = (replicas: ReplicaCount, isRollingOut: boolean, startingUp: boolean): WorkloadStatus => {
  const description = `${replicas.ready}/${replicas.desired} ready`;

  if (replicas.desired > 0 && replicas.ready === 0 && !isRollingOut && !startingUp) {
    return { health: "Degraded", replicas, description };
  }

  if (replicas.ready < replicas.desired || isRollingOut) {
    return { health: "Progressing", replicas, description };
  }

  return { health: "Healthy", replicas, description };
};

export const getDeploymentStatus = (deployment: Deployment): WorkloadStatus => {
  const replicas = {
    ready: deployment.status?.readyReplicas ?? 0,
    desired: deployment.getReplicas(),
  };
  const conditions = deployment.status?.conditions;
  const failure = hasCondition(conditions, "Progressing", "False") ?? hasCondition(conditions, "ReplicaFailure", "True");

  if (failure) {
    // e.g. ProgressDeadlineExceeded or FailedCreate
    return { health: "Degraded", replicas, description: failure.reason ?? failure.type };
  }

  // the deployment controller reports "NewReplicaSetAvailable" once a rollout has completed
  const progressing = hasCondition(conditions, "Progressing", "True");
  const isRollingOut = (deployment.status?.updatedReplicas ?? 0) < replicas.desired
    || Boolean(progressing && progressing.reason !== "NewReplicaSetAvailable");

  return fromReplicas(replicas, isRollingOut, isStartingUp(deployment));
};

export const getStatefulSetStatus = (statefulSet: StatefulSet): WorkloadStatus => {
  const { currentRevision, updateRevision, readyReplicas } = statefulSet.status ?? {};

  return fromReplicas(
    {
      ready: readyReplicas ?? 0,
      desired: statefulSet.getReplicas(),
    },
    Boolean(currentRevision && updateRevision && currentRevision !== updateRevision),
    isStartingUp(statefulSet),
  );
};

export const getDaemonSetStatus = (daemonSet: DaemonSet): WorkloadStatus => {
  const { desiredNumberScheduled = 0, numberReady = 0, updatedNumberScheduled } = daemonSet.status ?? {};

  return fromReplicas(
    {
      ready: numberReady,
      desired: desiredNumberScheduled,
    },
    updatedNumberScheduled !== undefined && updatedNumberScheduled < desiredNumberScheduled,
    isStartingUp(daemonSet),
  );
};

export const isFailedJob = (job: Job) => Boolean(hasCondition(job.status?.conditions, "Failed", "True"));

export const getJobStatus = (job: Job): WorkloadStatus => {
  const completions = `${job.getCompletions()}/${job.spec.completions ?? 1} completions`;

  if (isFailedJob(job)) {
    return { health: "Degraded", description: "Failed" };
  }

  if (hasCondition(job.status?.conditions, "Complete", "True")) {
    return { health: "Healthy", description: completions };
  }

  if ((job.spec as { suspend?: boolean }).suspend) {
    return { health: "Healthy", description: "Suspended" };
  }

  return { health: "Progressing", description: completions };
};

/**
 * A CronJob is degraded while its most recent run has failed, older failures are superseded by
 * later runs.
 */
export const getCronJobStatus = (cronJob: CronJob, lastJob: Job | undefined): WorkloadStatus => {
  if (lastJob && isFailedJob(lastJob)) {
    return { health: "Degraded", description: `Last run failed (${lastJob.getName()})` };
  }

  if (cronJob.isSuspend()) {
    return { health: "Healthy", description: "Suspended" };
  }

  const activeJobs = cronJob.status?.active?.length ?? 0;

  if (activeJobs > 0) {
    return { health: "Healthy", description: `${activeJobs} active` };
  }

  return { health: "Healthy", description: `Scheduled ${cronJob.getSchedule()}` };
};
