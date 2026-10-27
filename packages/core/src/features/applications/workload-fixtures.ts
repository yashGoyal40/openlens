/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { BaseKubeObjectCondition, OwnerReference } from "@k8slens/kube-object";
import { CronJob, DaemonSet, Deployment, Ingress, Job, Service, StatefulSet } from "@k8slens/kube-object";

// Builders of the objects the applications view groups, for tests only

type Labels = Partial<Record<string, string>>;

export interface ObjectOptions {
  namespace?: string;
  labels?: Labels;
  annotations?: Labels;
  createdAt?: string;
  ownerReferences?: OwnerReference[];
}

export interface PodOwnerOptions extends ObjectOptions {
  /**
   * Defaults to the labels of the workload
   */
  podLabels?: Labels;
}

const createMetadata = (apiBase: string, plural: string, name: string, options: ObjectOptions) => {
  const namespace = options.namespace ?? "default";

  return {
    name,
    namespace,
    uid: `${plural}-${namespace}-${name}`,
    resourceVersion: "1",
    selfLink: `${apiBase}/namespaces/${namespace}/${plural}/${name}`,
    creationTimestamp: options.createdAt ?? "2026-01-01T00:00:00Z",
    labels: options.labels,
    annotations: options.annotations,
    ownerReferences: options.ownerReferences,
  };
};

const podTemplate = (options: PodOwnerOptions) => ({
  metadata: { labels: options.podLabels ?? options.labels ?? {}},
  spec: {},
});

export interface ReplicatedOptions extends PodOwnerOptions {
  replicas?: number;
  readyReplicas?: number;
  updatedReplicas?: number;
  conditions?: BaseKubeObjectCondition[];
}

export const createDeployment = (name: string, options: ReplicatedOptions = {}) => {
  const { replicas = 1, readyReplicas = replicas, updatedReplicas = replicas, conditions } = options;

  return new Deployment({
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: createMetadata("/apis/apps/v1", "deployments", name, options),
    spec: {
      replicas,
      selector: { matchLabels: podTemplate(options).metadata.labels },
      template: podTemplate(options),
      strategy: { type: "RollingUpdate", rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }},
    },
    status: { observedGeneration: 1, replicas, updatedReplicas, readyReplicas, conditions },
  });
};

export const createStatefulSet = (name: string, options: ReplicatedOptions = {}) => {
  const { replicas = 1, readyReplicas = replicas } = options;

  return new StatefulSet({
    apiVersion: "apps/v1",
    kind: "StatefulSet",
    metadata: createMetadata("/apis/apps/v1", "statefulsets", name, options),
    spec: {
      serviceName: name,
      replicas,
      selector: { matchLabels: podTemplate(options).metadata.labels },
      template: podTemplate(options),
      volumeClaimTemplates: [],
    },
    status: {
      observedGeneration: 1,
      replicas,
      currentReplicas: replicas,
      readyReplicas,
      currentRevision: `${name}-1`,
      updateRevision: `${name}-1`,
      collisionCount: 0,
    },
  });
};

export const createDaemonSet = (name: string, options: ReplicatedOptions = {}) => {
  const { replicas = 1, readyReplicas = replicas } = options;

  return new DaemonSet({
    apiVersion: "apps/v1",
    kind: "DaemonSet",
    metadata: createMetadata("/apis/apps/v1", "daemonsets", name, options),
    spec: {
      selector: { matchLabels: podTemplate(options).metadata.labels },
      template: podTemplate(options),
      updateStrategy: { type: "RollingUpdate", rollingUpdate: {}},
    },
    status: {
      currentNumberScheduled: replicas,
      desiredNumberScheduled: replicas,
      numberMisscheduled: 0,
      numberReady: readyReplicas,
      updatedNumberScheduled: replicas,
    },
  });
};

export interface JobOptions extends PodOwnerOptions {
  outcome?: "Complete" | "Failed" | "Running";
}

export const createJob = (name: string, options: JobOptions = {}) => {
  const { outcome = "Complete" } = options;

  return new Job({
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: createMetadata("/apis/batch/v1", "jobs", name, options),
    spec: {
      completions: 1,
      template: podTemplate(options),
    },
    status: {
      startTime: options.createdAt ?? "2026-01-01T00:00:00Z",
      completionTime: options.createdAt ?? "2026-01-01T00:00:00Z",
      succeeded: outcome === "Complete" ? 1 : 0,
      conditions: outcome === "Running"
        ? []
        : [{ type: outcome, status: "True" }],
    },
  });
};

export interface CronJobOptions extends PodOwnerOptions {
  suspend?: boolean;
}

export const createCronJob = (name: string, options: CronJobOptions = {}) => new CronJob({
  apiVersion: "batch/v1",
  kind: "CronJob",
  metadata: createMetadata("/apis/batch/v1", "cronjobs", name, options),
  spec: {
    schedule: "0 3 * * *",
    suspend: options.suspend,
    jobTemplate: {
      spec: {
        template: podTemplate(options),
      },
    },
  },
  status: {},
});

/**
 * A job as a CronJob creates it, owned by the CronJob
 */
export const createJobOf = (cronJob: CronJob, name: string, options: JobOptions = {}) => createJob(name, {
  namespace: cronJob.getNs(),
  podLabels: cronJob.spec.jobTemplate?.spec?.template.metadata.labels,
  ...options,
  ownerReferences: [{
    apiVersion: "batch/v1",
    kind: "CronJob",
    name: cronJob.getName(),
    uid: cronJob.getId(),
    controller: true,
  }],
});

export interface ServiceOptions extends ObjectOptions {
  selector?: Labels;
}

export const createService = (name: string, options: ServiceOptions = {}) => new Service({
  apiVersion: "v1",
  kind: "Service",
  metadata: createMetadata("/api/v1", "services", name, options),
  spec: {
    type: "ClusterIP",
    clusterIP: "10.96.0.10",
    sessionAffinity: "None",
    selector: options.selector ?? {},
    ports: [{ protocol: "TCP", port: 80, targetPort: 8080 }],
  },
});

export interface IngressOptions extends ObjectOptions {
  host?: string;
  serviceName: string;
}

export const createIngress = (name: string, options: IngressOptions) => new Ingress({
  apiVersion: "networking.k8s.io/v1",
  kind: "Ingress",
  metadata: createMetadata("/apis/networking.k8s.io/v1", "ingresses", name, options),
  spec: {
    tls: [],
    rules: [{
      host: options.host,
      http: {
        paths: [{
          pathType: "Prefix",
          path: "/",
          backend: { service: { name: options.serviceName, port: { number: 80 }}},
        }],
      },
    }],
  },
  status: { loadBalancer: { ingress: [{ ip: "203.0.113.10" }] }},
});
