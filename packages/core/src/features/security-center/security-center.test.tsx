/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent, within } from "@testing-library/react";
import { Deployment, Pod, ReplicaSet } from "@k8slens/kube-object";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import showDetailsInjectable from "../../renderer/components/kube-detail-params/show-details.injectable";
import deploymentStoreInjectable from "../../renderer/components/workloads-deployments/store.injectable";
import replicaSetStoreInjectable from "../../renderer/components/workloads-replicasets/store.injectable";
import podStoreInjectable from "../../renderer/components/workloads-pods/store.injectable";
import openLinkInBrowserInjectable from "../../common/utils/open-link-in-browser.injectable";
import { ConfigAuditReport, ExposedSecretReport, VulnerabilityReport } from "./common/security-center-resources";
import { navigateToSecurityOverviewInjectable, navigateToVulnerabilityReportsInjectable } from "./common/security-center-routes.injectable";
import { storeInjectable as vulnerabilityReportStoreInjectable } from "./renderer/vulnerability-reports.injectable";
import { storeInjectable as configAuditReportStoreInjectable } from "./renderer/config-audit-reports.injectable";
import { storeInjectable as exposedSecretReportStoreInjectable } from "./renderer/exposed-secret-reports.injectable";

const group = "aquasecurity.github.io";

const reportMetadata = (kind: string, name: string, namespace: string, target: { kind: string; name: string; container?: string }) => ({
  name,
  namespace,
  resourceVersion: "1",
  uid: `${name}-uid`,
  selfLink: `/apis/${group}/v1alpha1/namespaces/${namespace}/${kind}/${name}`,
  labels: {
    "trivy-operator.resource.kind": target.kind,
    "trivy-operator.resource.name": target.name,
    "trivy-operator.resource.namespace": namespace,
    ...(target.container ? { "trivy-operator.container.name": target.container } : {}),
  },
});

const vulnerabilityReport = (
  name: string,
  namespace: string,
  target: { kind: string; name: string; container: string },
  image: { repository: string; tag: string },
  summary: { criticalCount: number; highCount: number; mediumCount: number; lowCount: number; unknownCount: number },
) => new VulnerabilityReport({
  apiVersion: `${group}/v1alpha1`,
  kind: "VulnerabilityReport",
  metadata: reportMetadata("vulnerabilityreports", name, namespace, target),
  report: {
    updateTimestamp: "2026-10-01T12:00:00Z",
    scanner: { name: "Trivy", vendor: "Aqua Security", version: "0.50.0" },
    registry: { server: "index.docker.io" },
    artifact: image,
    summary,
    vulnerabilities: [
      {
        vulnerabilityID: "CVE-2026-0001",
        resource: "libssl3",
        installedVersion: "3.0.11",
        fixedVersion: "3.0.13",
        severity: "HIGH",
        title: "openssl: a high severity issue",
        primaryLink: "https://avd.aquasec.com/nvd/cve-2026-high",
        score: 7.5,
      },
      {
        vulnerabilityID: "CVE-2026-0002",
        resource: "zlib1g",
        installedVersion: "1.2.13",
        severity: "CRITICAL",
        title: "zlib: a critical issue",
        primaryLink: "https://avd.aquasec.com/nvd/cve-2026-0002",
        score: 9.8,
      },
    ],
  },
});

const storefrontDeployment = new Deployment({
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: "storefront",
    namespace: "default",
    resourceVersion: "1",
    uid: "storefront-deployment-uid",
    selfLink: "/apis/apps/v1/namespaces/default/deployments/storefront",
    annotations: { "deployment.kubernetes.io/revision": "2" },
  },
  spec: {
    replicas: 1,
    selector: { matchLabels: { app: "storefront" }},
    strategy: { type: "RollingUpdate", rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }},
    template: {
      metadata: { labels: { app: "storefront" }},
      spec: { containers: [{ name: "app", image: "nginx:1.25" }] },
    },
  },
  status: { observedGeneration: 1, replicas: 1, updatedReplicas: 1, readyReplicas: 1 },
});

const replicaSet = (name: string, revision: string, replicas: number) => new ReplicaSet({
  apiVersion: "apps/v1",
  kind: "ReplicaSet",
  metadata: {
    name,
    namespace: "default",
    resourceVersion: "1",
    uid: `${name}-uid`,
    selfLink: `/apis/apps/v1/namespaces/default/replicasets/${name}`,
    annotations: { "deployment.kubernetes.io/revision": revision },
    ownerReferences: [{
      apiVersion: "apps/v1",
      kind: "Deployment",
      name: "storefront",
      uid: "storefront-deployment-uid",
      controller: true,
    }],
  },
  spec: {
    replicas,
    selector: { matchLabels: { app: "storefront" }},
    template: {
      metadata: { labels: { app: "storefront" }},
      spec: { containers: [{ name: "app", image: "nginx" }] },
    },
  },
  status: { replicas },
});

const storefrontPod = new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name: "storefront-6d4cf56db6-x7k2p",
    namespace: "default",
    resourceVersion: "1",
    uid: "storefront-pod-uid",
    selfLink: "/api/v1/namespaces/default/pods/storefront-6d4cf56db6-x7k2p",
    ownerReferences: [{
      apiVersion: "apps/v1",
      kind: "ReplicaSet",
      name: "storefront-6d4cf56db6",
      uid: "storefront-6d4cf56db6-uid",
      controller: true,
    }],
  },
  spec: {
    containers: [{ name: "app", image: "nginx:1.25" }],
  },
});

describe("security center", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let openLinkInBrowserMock: jest.Mock;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");
    builder.namespaces.add("shop");

    openLinkInBrowserMock = jest.fn(async () => {});
    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(openLinkInBrowserInjectable, () => openLinkInBrowserMock);
    });
  });

  const getTableRows = (testId: string) => Array.from(rendered.getByTestId(testId).querySelectorAll<HTMLElement>(".TableRow"));

  describe("given the cluster does not serve trivy operator reports", () => {
    beforeEach(async () => {
      rendered = await builder.render();
    });

    it("does not show the security sidebar group", () => {
      expect(rendered.queryByTestId("sidebar-item-security-center")).toBeNull();
    });
  });

  describe("given the cluster serves vulnerability reports, but none exist yet", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({ apiName: "vulnerabilityreports", group });

        const store = windowDi.inject(vulnerabilityReportStoreInjectable);

        store.items.replace([]);
        store.isLoaded = true;
      });

      rendered = await builder.render();
      builder.navigateWith(navigateToSecurityOverviewInjectable);
    });

    it("shows how to install the trivy operator", () => {
      const emptyState = rendered.getByTestId("security-overview-empty-state");

      expect(emptyState).toHaveTextContent("No security reports found");
      expect(emptyState).toHaveTextContent("helm install trivy-operator aqua/trivy-operator");
    });
  });

  describe("given the cluster serves trivy operator reports", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({ apiName: "vulnerabilityreports", group });
        builder.allowKubeResource({ apiName: "configauditreports", group });
        builder.allowKubeResource({ apiName: "exposedsecretreports", group });

        const vulnerabilityReportStore = windowDi.inject(vulnerabilityReportStoreInjectable);

        vulnerabilityReportStore.items.replace([
          vulnerabilityReport(
            "replicaset-storefront-6d4cf56db6-app",
            "default",
            { kind: "ReplicaSet", name: "storefront-6d4cf56db6", container: "app" },
            { repository: "library/nginx", tag: "1.25" },
            { criticalCount: 2, highCount: 1, mediumCount: 0, lowCount: 3, unknownCount: 0 },
          ),
          // the previous revision of the deployment, which is no longer running
          vulnerabilityReport(
            "replicaset-storefront-5c7b9d8f4-app",
            "default",
            { kind: "ReplicaSet", name: "storefront-5c7b9d8f4", container: "app" },
            { repository: "library/nginx", tag: "1.23" },
            { criticalCount: 5, highCount: 0, mediumCount: 0, lowCount: 0, unknownCount: 0 },
          ),
          vulnerabilityReport(
            "statefulset-postgres-postgres",
            "shop",
            { kind: "StatefulSet", name: "postgres", container: "postgres" },
            { repository: "library/postgres", tag: "16" },
            { criticalCount: 0, highCount: 4, mediumCount: 2, lowCount: 1, unknownCount: 1 },
          ),
        ]);
        vulnerabilityReportStore.isLoaded = true;

        const configAuditReportStore = windowDi.inject(configAuditReportStoreInjectable);

        configAuditReportStore.items.replace([
          new ConfigAuditReport({
            apiVersion: `${group}/v1alpha1`,
            kind: "ConfigAuditReport",
            metadata: reportMetadata("configauditreports", "replicaset-storefront-6d4cf56db6", "default", {
              kind: "ReplicaSet",
              name: "storefront-6d4cf56db6",
            }),
            report: {
              scanner: { name: "Trivy", vendor: "Aqua Security", version: "0.50.0" },
              summary: { criticalCount: 0, highCount: 1, mediumCount: 2, lowCount: 0 },
              checks: [
                { checkID: "KSV014", title: "Root file system is not read-only", severity: "HIGH", success: false },
                { checkID: "KSV011", title: "CPU not limited", severity: "MEDIUM", success: false },
                { checkID: "KSV018", title: "Memory not limited", severity: "MEDIUM", success: false },
              ],
            },
          }),
        ]);
        configAuditReportStore.isLoaded = true;

        const exposedSecretReportStore = windowDi.inject(exposedSecretReportStoreInjectable);

        exposedSecretReportStore.items.replace([
          new ExposedSecretReport({
            apiVersion: `${group}/v1alpha1`,
            kind: "ExposedSecretReport",
            metadata: reportMetadata("exposedsecretreports", "replicaset-storefront-6d4cf56db6-app", "default", {
              kind: "ReplicaSet",
              name: "storefront-6d4cf56db6",
              container: "app",
            }),
            report: {
              artifact: { repository: "library/nginx", tag: "1.25" },
              summary: { criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0 },
              secrets: [{ ruleID: "aws-access-key-id", category: "AWS", severity: "CRITICAL", title: "AWS Access Key ID", target: "/app/.env" }],
            },
          }),
        ]);
        exposedSecretReportStore.isLoaded = true;
      });

      rendered = await builder.render();
    });

    describe("when the security sidebar group is expanded", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-security-center"));
      });

      it("shows the overview and the served report kinds only", () => {
        expect(rendered.getByTestId("sidebar-item-security-center-overview")).toBeInTheDocument();
        expect(rendered.getByTestId("sidebar-item-security-center-vulnerability-reports")).toBeInTheDocument();
        expect(rendered.getByTestId("sidebar-item-security-center-config-audit-reports")).toBeInTheDocument();
        expect(rendered.queryByTestId("sidebar-item-security-center-rbac-assessment-reports")).toBeNull();
      });
    });

    describe("when navigating to the overview", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToSecurityOverviewInjectable);
      });

      it("shows the severity totals of all vulnerability reports", () => {
        expect(rendered.getByTestId("security-overview-total-critical")).toHaveTextContent("7Critical");
        expect(rendered.getByTestId("security-overview-total-high")).toHaveTextContent("5High");
        expect(rendered.getByTestId("security-overview-total-medium")).toHaveTextContent("2Medium");
        expect(rendered.getByTestId("security-overview-total-low")).toHaveTextContent("4Low");
        expect(rendered.getByTestId("security-overview-total-unknown")).toHaveTextContent("1Unknown");
      });

      it("shows the most vulnerable workloads worst first, linking to them", () => {
        const rows = getTableRows("security-overview-top-workloads");

        expect(rows.map(row => row.textContent)).toEqual([
          "ReplicaSet storefront-5c7b9d8f4defaultC 5",
          "ReplicaSet storefront-6d4cf56db6defaultC 2H 1L 3",
          "StatefulSet postgresshopH 4M 2L 1U 1",
        ]);
        expect(within(rows[1]).getByText("ReplicaSet storefront-6d4cf56db6").closest("a")).not.toBeNull();
      });

      it("shows the most vulnerable images", () => {
        const images = rendered.getByTestId("security-overview-top-images");

        expect(within(images).getByText("library/postgres:16")).toBeInTheDocument();
      });

      it("shows the most affected namespaces", () => {
        const rows = getTableRows("security-overview-namespaces");

        expect(rows.map(row => row.textContent)).toEqual([
          "default2C 7H 1L 3",
          "shop1H 4M 2L 1U 1",
        ]);
      });

      it("shows the failed config audit checks by severity", () => {
        const audits = rendered.getByTestId("security-overview-config-audits");

        expect(within(audits).getByText("1 High")).toBeInTheDocument();
        expect(within(audits).getByText("2 Medium")).toBeInTheDocument();
      });

      it("shows the number of exposed secrets", () => {
        const secrets = rendered.getByTestId("security-overview-exposed-secrets");

        expect(within(secrets).getByText("1 Critical")).toBeInTheDocument();
        expect(secrets).toHaveTextContent("found in 1 of 1 scanned images");
      });

      describe("when the namespace selection is narrowed down", () => {
        beforeEach(() => {
          builder.namespaces.select("shop");
        });

        it("only counts the reports of the selected namespaces", () => {
          expect(rendered.getByTestId("security-overview-total-critical")).toHaveTextContent("0Critical");
          expect(rendered.getByTestId("security-overview-total-high")).toHaveTextContent("4High");
        });
      });
    });

    describe("when navigating to vulnerability reports", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToVulnerabilityReportsInjectable);
      });

      it("shows the list title", () => {
        expect(rendered.getByText("Vulnerability Reports", { selector: "h5" })).toBeInTheDocument();
      });

      it("shows the scanned resource, container, image and severity counts", () => {
        expect(rendered.getByText("statefulset-postgres-postgres")).toBeInTheDocument();
        expect(rendered.getByText("StatefulSet postgres")).toBeInTheDocument();
        expect(rendered.getByText("library/postgres:16")).toBeInTheDocument();
        expect(rendered.getByText("H 4")).toBeInTheDocument();
        expect(rendered.getByText("C 5")).toBeInTheDocument();
      });

      describe("when opening the details of a report", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByText("replicaset-storefront-6d4cf56db6-app"));
        });

        it("lists the vulnerabilities, most severe first", () => {
          const ids = rendered.getAllByText(/^CVE-2026-/).map(element => element.textContent);

          expect(ids).toEqual(["CVE-2026-0002", "CVE-2026-0001"]);
        });

        it("opens the primary link of a vulnerability in the browser", () => {
          fireEvent.click(rendered.getByText("CVE-2026-0002"));

          expect(openLinkInBrowserMock).toHaveBeenCalledWith("https://avd.aquasec.com/nvd/cve-2026-0002");
        });
      });
    });

    describe("given workloads of the deployment", () => {
      beforeEach(() => {
        const windowDi = builder.applicationWindow.only.di;

        windowDi.inject(deploymentStoreInjectable).items.replace([storefrontDeployment]);
        windowDi.inject(replicaSetStoreInjectable).items.replace([
          replicaSet("storefront-6d4cf56db6", "2", 1),
          replicaSet("storefront-5c7b9d8f4", "1", 0),
        ]);
        windowDi.inject(podStoreInjectable).items.replace([storefrontPod]);
      });

      describe("when showing the details of the deployment", () => {
        beforeEach(() => {
          builder.applicationWindow.only.di.inject(showDetailsInjectable)(storefrontDeployment.selfLink);
        });

        it("shows the vulnerabilities of its current replica set only", async () => {
          const vulnerabilities = await rendered.findByTestId("workload-vulnerabilities");

          expect(within(vulnerabilities).getByText("library/nginx:1.25")).toBeInTheDocument();
          expect(within(vulnerabilities).queryByText("library/nginx:1.23")).toBeNull();
          expect(within(vulnerabilities).getByText("2 Critical")).toBeInTheDocument();
          expect(within(vulnerabilities).getByText("ReplicaSet storefront-6d4cf56db6")).toBeInTheDocument();
        });

        it("links to the report", async () => {
          const vulnerabilities = await rendered.findByTestId("workload-vulnerabilities");

          expect(within(vulnerabilities).getByText("library/nginx:1.25").closest("a")).not.toBeNull();
        });
      });

      describe("when showing the details of a pod of the deployment", () => {
        beforeEach(() => {
          builder.applicationWindow.only.di.inject(showDetailsInjectable)(storefrontPod.selfLink);
        });

        it("shows the vulnerabilities reported for the owning replica set", async () => {
          const vulnerabilities = await rendered.findByTestId("workload-vulnerabilities");

          expect(within(vulnerabilities).getByText("app")).toBeInTheDocument();
          expect(within(vulnerabilities).getByText("C 2")).toBeInTheDocument();
        });
      });
    });
  });
});
