/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { CronJob, Deployment } from "@k8slens/kube-object";
import {
  createCronJob,
  createDaemonSet,
  createDeployment,
  createIngress,
  createJob,
  createJobOf,
  createService,
  createStatefulSet,
} from "../workload-fixtures";
import { getChartVersion } from "./application-labels";
import { getApplicationServices, getIngressesRoutingTo } from "./application-networking";
import type { Application, WorkloadsByKind } from "./applications";
import { groupApplications } from "./applications";

const group = (workloads: Partial<WorkloadsByKind>) => groupApplications({
  deployments: [],
  statefulSets: [],
  daemonSets: [],
  jobs: [],
  cronJobs: [],
  ...workloads,
});

const only = (applications: Application[], name: string, namespace = "default") => {
  const found = applications.filter(application => application.name === name && application.namespace === namespace);

  expect(found).toHaveLength(1);

  return found[0];
};

const workloadNames = (application: Application) => application.workloads.map(({ object }) => `${object.kind}/${object.getName()}`);

describe("applications / grouping workloads", () => {
  it("groups the workloads of a namespace that share the app.kubernetes.io/instance label", () => {
    const applications = group({
      deployments: [createDeployment("shop-frontend", { labels: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/name": "frontend" }})],
      statefulSets: [createStatefulSet("shop-db", { labels: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/name": "postgresql" }})],
    });

    expect(applications).toHaveLength(1);
    expect(workloadNames(only(applications, "shop"))).toEqual(["Deployment/shop-frontend", "StatefulSet/shop-db"]);
    expect(only(applications, "shop").identitySources).toEqual(["label app.kubernetes.io/instance"]);
  });

  it("keeps applications of the same name in different namespaces apart", () => {
    const applications = group({
      deployments: [
        createDeployment("shop", { labels: { "app.kubernetes.io/instance": "shop" }}),
        createDeployment("shop", { namespace: "staging", labels: { "app.kubernetes.io/instance": "shop" }}),
      ],
    });

    expect(applications.map(application => application.getId())).toEqual(["default/shop", "staging/shop"]);
  });

  it("orders applications by name, then namespace", () => {
    const applications = group({
      deployments: [
        createDeployment("web", { namespace: "staging", labels: { app: "shop" }}),
        createDeployment("web", { labels: { app: "shop" }}),
      ],
      statefulSets: [createStatefulSet("db", { labels: { app: "billing" }})],
    });

    expect(applications.map(application => application.getId())).toEqual(["default/billing", "default/shop", "staging/shop"]);
  });

  it.each([
    ["app.kubernetes.io/name label", { labels: { "app.kubernetes.io/name": "billing" }}, "label app.kubernetes.io/name"],
    ["app label", { labels: { app: "billing" }}, "label app"],
    ["helm release annotation", { annotations: { "meta.helm.sh/release-name": "billing" }}, "annotation meta.helm.sh/release-name"],
    ["argo cd instance label", { labels: { "argocd.argoproj.io/instance": "billing" }}, "label argocd.argoproj.io/instance"],
  ])("falls back to the %s", (_, options, source) => {
    const application = only(group({ deployments: [createDeployment("billing-api", options)] }), "billing");

    expect(application.identitySources).toEqual([source]);
  });

  it("prefers the instance label over the other identity labels", () => {
    const applications = group({
      deployments: [createDeployment("api", {
        labels: { "app.kubernetes.io/instance": "billing", "app.kubernetes.io/name": "api", app: "api" },
        annotations: { "meta.helm.sh/release-name": "other" },
      })],
    });

    expect(applications.map(application => application.name)).toEqual(["billing"]);
  });

  it("puts a workload without identity labels in an application named after the workload", () => {
    const application = only(group({ deployments: [createDeployment("legacy-worker")] }), "legacy-worker");

    expect(application.identitySources).toEqual(["workload name"]);
  });

  it("includes cron jobs and standalone jobs, but not the jobs a cron job created", () => {
    const cronJob = createCronJob("reports-nightly", { labels: { "app.kubernetes.io/instance": "reports" }});
    const applications = group({
      cronJobs: [cronJob],
      jobs: [
        createJobOf(cronJob, "reports-nightly-1"),
        createJob("reports-backfill", { labels: { "app.kubernetes.io/instance": "reports" }}),
      ],
    });

    expect(applications).toHaveLength(1);
    expect(workloadNames(only(applications, "reports"))).toEqual(["CronJob/reports-nightly", "Job/reports-backfill"]);
  });

  it("is as old as its oldest workload", () => {
    const application = only(group({
      deployments: [
        createDeployment("new", { labels: { app: "shop" }, createdAt: "2026-05-01T00:00:00Z" }),
        createDeployment("old", { labels: { app: "shop" }, createdAt: "2025-05-01T00:00:00Z" }),
      ],
    }), "shop");

    expect(application.oldestWorkload.getName()).toBe("old");
  });
});

describe("applications / version and manager", () => {
  it("takes the version from the app.kubernetes.io/version label", () => {
    const application = only(group({
      deployments: [createDeployment("shop", { labels: { app: "shop", "app.kubernetes.io/version": "1.4.2", "helm.sh/chart": "shop-0.3.0" }})],
    }), "shop");

    expect(application.versions).toEqual(["1.4.2"]);
  });

  it("falls back to the version of the helm chart", () => {
    const application = only(group({
      deployments: [createDeployment("shop", { labels: { app: "shop", "helm.sh/chart": "shop-0.3.0" }})],
    }), "shop");

    expect(application.versions).toEqual(["0.3.0"]);
  });

  it("lists each distinct version once", () => {
    const application = only(group({
      deployments: [
        createDeployment("a", { labels: { app: "shop", "app.kubernetes.io/version": "1.0.0" }}),
        createDeployment("b", { labels: { app: "shop", "app.kubernetes.io/version": "1.0.0" }}),
        createDeployment("c", { labels: { app: "shop", "app.kubernetes.io/version": "1.1.0" }}),
      ],
    }), "shop");

    expect(application.versions).toEqual(["1.0.0", "1.1.0"]);
  });

  it.each([
    ["nginx-1.2.3", "1.2.3"],
    ["kube-prometheus-stack-45.7.1", "45.7.1"],
    ["my-app2-1.0.0-rc.1", "1.0.0-rc.1"],
    ["cert-manager-v1.14.4", "v1.14.4"],
    ["not-a-version", undefined],
  ])("reads the version of chart label %s", (chart, version) => {
    expect(getChartVersion(chart)).toBe(version);
  });

  it.each([
    ["Helm from the managed-by label", { labels: { app: "x", "app.kubernetes.io/managed-by": "Helm" }}, "Helm"],
    ["Helm from the release annotation", { annotations: { "meta.helm.sh/release-name": "x" }}, "Helm"],
    ["Argo CD from its instance label, over Helm", { labels: { app: "x", "app.kubernetes.io/managed-by": "Helm", "argocd.argoproj.io/instance": "x" }}, "Argo CD"],
    ["Flux from its kustomization label", { labels: { app: "x", "kustomize.toolkit.fluxcd.io/name": "apps" }}, "Flux"],
    ["Flux from its helm release label", { labels: { app: "x", "app.kubernetes.io/managed-by": "Helm", "helm.toolkit.fluxcd.io/name": "x" }}, "Flux"],
    ["other managers by name", { labels: { app: "x", "app.kubernetes.io/managed-by": "skaffold" }}, "skaffold"],
  ])("recognises %s", (_, options, manager) => {
    expect(group({ deployments: [createDeployment("x", options)] })[0].managers).toEqual([manager]);
  });

  it("has no manager when nothing declares one", () => {
    expect(group({ deployments: [createDeployment("x", { labels: { app: "x" }})] })[0].managers).toEqual([]);
  });
});

describe("applications / status", () => {
  const statusOf = (workloads: Partial<WorkloadsByKind>) => group(workloads)[0].status;
  const shop = { labels: { app: "shop" }};

  it("is healthy when all replicas of all workloads are ready", () => {
    expect(statusOf({
      deployments: [createDeployment("web", { ...shop, replicas: 2 })],
      statefulSets: [createStatefulSet("db", { ...shop, replicas: 1 })],
      daemonSets: [createDaemonSet("agent", { ...shop, replicas: 3 })],
    })).toEqual({
      health: "Healthy",
      replicas: { ready: 6, desired: 6 },
      description: "6/6 replicas ready",
    });
  });

  it("is progressing while some replicas are not ready yet", () => {
    expect(statusOf({
      deployments: [
        createDeployment("web", { ...shop, replicas: 3, readyReplicas: 1 }),
        createDeployment("api", { ...shop, replicas: 1 }),
      ],
    })).toMatchObject({ health: "Progressing", replicas: { ready: 2, desired: 4 }});
  });

  it("is progressing while a rollout replaces pods", () => {
    expect(statusOf({
      deployments: [createDeployment("web", { ...shop, replicas: 2, updatedReplicas: 1 })],
    }).health).toBe("Progressing");
  });

  it("is degraded when a workload has no ready replica", () => {
    expect(statusOf({
      deployments: [
        createDeployment("web", { ...shop, replicas: 2 }),
        createDeployment("api", { ...shop, replicas: 1, readyReplicas: 0 }),
      ],
    }).health).toBe("Degraded");
  });

  it("is progressing when a workload created moments ago has no ready replica yet", () => {
    expect(statusOf({
      deployments: [createDeployment("web", { ...shop, replicas: 2, readyReplicas: 0, createdAt: new Date(Date.now() - 30_000).toISOString() })],
    }).health).toBe("Progressing");
  });

  it("is progressing while a deployment rolls out, even without ready replicas", () => {
    expect(statusOf({
      deployments: [createDeployment("web", {
        ...shop,
        replicas: 2,
        readyReplicas: 0,
        conditions: [{ type: "Progressing", status: "True", reason: "ReplicaSetUpdated" }],
      })],
    }).health).toBe("Progressing");
  });

  it("is degraded when a deployment exceeded its progress deadline", () => {
    expect(statusOf({
      deployments: [createDeployment("web", {
        ...shop,
        replicas: 2,
        readyReplicas: 1,
        conditions: [{ type: "Progressing", status: "False", reason: "ProgressDeadlineExceeded" }],
      })],
    }).health).toBe("Degraded");
  });

  it("is healthy when scaled to zero", () => {
    expect(statusOf({
      deployments: [createDeployment("web", { ...shop, replicas: 0 })],
    }).health).toBe("Healthy");
  });

  it("is degraded when a job failed", () => {
    expect(statusOf({
      deployments: [createDeployment("web", shop)],
      jobs: [createJob("migrate", { ...shop, outcome: "Failed" })],
    })).toEqual({
      health: "Degraded",
      replicas: { ready: 1, desired: 1 },
      description: "1/1 replicas ready, 1 failed job",
    });
  });

  it("is progressing while a job runs", () => {
    expect(statusOf({ jobs: [createJob("migrate", { ...shop, outcome: "Running" })] }).health).toBe("Progressing");
  });

  describe("given a cron job", () => {
    let cronJob: CronJob;

    beforeEach(() => {
      cronJob = createCronJob("nightly", shop);
    });

    it("is degraded when its last run failed", () => {
      expect(statusOf({
        cronJobs: [cronJob],
        jobs: [
          createJobOf(cronJob, "nightly-1", { createdAt: "2026-01-01T03:00:00Z", outcome: "Complete" }),
          createJobOf(cronJob, "nightly-2", { createdAt: "2026-01-02T03:00:00Z", outcome: "Failed" }),
        ],
      }).health).toBe("Degraded");
    });

    it("is healthy when a later run succeeded after a failure", () => {
      expect(statusOf({
        cronJobs: [cronJob],
        jobs: [
          createJobOf(cronJob, "nightly-1", { createdAt: "2026-01-01T03:00:00Z", outcome: "Failed" }),
          createJobOf(cronJob, "nightly-2", { createdAt: "2026-01-02T03:00:00Z", outcome: "Complete" }),
        ],
      }).health).toBe("Healthy");
    });
  });
});

describe("applications / networking", () => {
  let deployment: Deployment;
  let application: Application;

  beforeEach(() => {
    deployment = createDeployment("shop-web", {
      labels: { "app.kubernetes.io/instance": "shop" },
      podLabels: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/component": "web", "pod-template-hash": "abc" },
    });
    application = group({ deployments: [deployment] })[0];
  });

  it("finds the services whose selector matches the pod labels of a workload", () => {
    const services = getApplicationServices(application, [
      createService("shop-web", { selector: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/component": "web" }}),
      createService("shop-api", { selector: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/component": "api" }}),
      createService("shop-web", { namespace: "staging", selector: { "app.kubernetes.io/instance": "shop" }}),
      createService("external-db", { selector: {}}),
    ]);

    expect(services.map(service => service.getScopedName())).toEqual(["default/shop-web"]);
  });

  it("finds the ingresses routing to those services", () => {
    const services = [createService("shop-web", { selector: { "app.kubernetes.io/instance": "shop" }})];
    const ingresses = getIngressesRoutingTo(services, [
      createIngress("shop", { serviceName: "shop-web", host: "shop.example.com" }),
      createIngress("blog", { serviceName: "blog", host: "blog.example.com" }),
      createIngress("shop", { namespace: "staging", serviceName: "shop-web" }),
    ]);

    expect(ingresses.map(ingress => ingress.getScopedName())).toEqual(["default/shop"]);
  });
});
