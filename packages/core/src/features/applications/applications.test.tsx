/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent, within } from "@testing-library/react";
import { runInAction } from "mobx";
import type { DiContainer } from "@ogre-tools/injectable";
import type { KubeObject } from "@k8slens/kube-object";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { KubeObjectStore } from "../../common/k8s-api/kube-object.store";
import deploymentStoreInjectable from "../../renderer/components/workloads-deployments/store.injectable";
import statefulSetStoreInjectable from "../../renderer/components/workloads-statefulsets/store.injectable";
import daemonSetStoreInjectable from "../../renderer/components/workloads-daemonsets/store.injectable";
import jobStoreInjectable from "../../renderer/components/workloads-jobs/store.injectable";
import cronJobStoreInjectable from "../../renderer/components/workloads-cronjobs/store.injectable";
import serviceStoreInjectable from "../../renderer/components/network-services/store.injectable";
import ingressStoreInjectable from "../../renderer/components/network-ingresses/ingress-store.injectable";
import searchUrlPageParamInjectable from "../../renderer/components/input/search-url-page-param.injectable";
import hideDetailsInjectable from "../../renderer/components/kube-detail-params/hide-details.injectable";
import showDetailsInjectable from "../../renderer/components/kube-detail-params/show-details.injectable";
import navigateToApplicationsInjectable from "./common/navigate-to-applications.injectable";
import {
  createCronJob,
  createDaemonSet,
  createDeployment,
  createIngress,
  createJob,
  createJobOf,
  createService,
  createStatefulSet,
} from "./workload-fixtures";

const fill = <K extends KubeObject>(store: KubeObjectStore<K, any, any>, items: K[]) => {
  runInAction(() => {
    store.items.replace(items);
    store.isLoaded = true;
  });
};

const reportsCronJob = createCronJob("reports-nightly", {
  annotations: { "meta.helm.sh/release-name": "reports" },
  labels: { "app.kubernetes.io/managed-by": "Helm", "helm.sh/chart": "reports-2.1.0" },
});

const putWorkloadsInStores = (windowDi: DiContainer) => {
  fill(windowDi.inject(deploymentStoreInjectable), [
    createDeployment("shop-frontend", {
      labels: {
        "app.kubernetes.io/instance": "shop",
        "app.kubernetes.io/name": "frontend",
        "app.kubernetes.io/version": "1.2.0",
        "app.kubernetes.io/managed-by": "Helm",
      },
      podLabels: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/name": "frontend" },
      replicas: 2,
      createdAt: "2026-03-01T00:00:00Z",
    }),
    createDeployment("billing-api", {
      labels: { app: "billing", "argocd.argoproj.io/instance": "billing-prod" },
      replicas: 3,
      readyReplicas: 1,
    }),
    createDeployment("shop", {
      namespace: "staging",
      labels: { "app.kubernetes.io/instance": "shop" },
    }),
  ]);
  fill(windowDi.inject(statefulSetStoreInjectable), [
    createStatefulSet("shop-db", {
      labels: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/name": "postgresql" },
      podLabels: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/name": "postgresql" },
      createdAt: "2026-02-01T00:00:00Z",
    }),
  ]);
  fill(windowDi.inject(daemonSetStoreInjectable), [
    createDaemonSet("log-agent", {
      labels: { "app.kubernetes.io/name": "log-agent", "kustomize.toolkit.fluxcd.io/name": "infra" },
      replicas: 3,
    }),
  ]);
  fill(windowDi.inject(cronJobStoreInjectable), [reportsCronJob]);
  fill(windowDi.inject(jobStoreInjectable), [
    createJobOf(reportsCronJob, "reports-nightly-29000000", { outcome: "Failed" }),
    createJob("db-migrate", { outcome: "Complete" }),
  ]);
  fill(windowDi.inject(serviceStoreInjectable), [
    createService("shop-frontend", { selector: { "app.kubernetes.io/instance": "shop", "app.kubernetes.io/name": "frontend" }}),
    createService("billing", { selector: { app: "billing" }}),
  ]);
  fill(windowDi.inject(ingressStoreInjectable), [
    createIngress("shop", { serviceName: "shop-frontend", host: "shop.example.com" }),
  ]);
};

const allowWorkloadsAndNetworking = (builder: ApplicationBuilder) => {
  builder.allowKubeResource({ apiName: "deployments", group: "apps" });
  builder.allowKubeResource({ apiName: "statefulsets", group: "apps" });
  builder.allowKubeResource({ apiName: "daemonsets", group: "apps" });
  builder.allowKubeResource({ apiName: "jobs", group: "batch" });
  builder.allowKubeResource({ apiName: "cronjobs", group: "batch" });
  builder.allowKubeResource({ apiName: "services", group: "" });
  builder.allowKubeResource({ apiName: "ingresses", group: "networking.k8s.io" });
};

describe("applications", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let windowDi: DiContainer;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");
    builder.namespaces.add("staging");
  });

  describe("given only jobs can be listed", () => {
    beforeEach(async () => {
      builder.afterWindowStart(() => {
        builder.allowKubeResource({ apiName: "jobs", group: "batch" });
      });

      rendered = await builder.render();
    });

    it("does not show the applications sidebar item", () => {
      expect(rendered.queryByTestId("sidebar-item-applications")).toBeNull();
    });
  });

  describe("given only statefulsets can be listed", () => {
    beforeEach(async () => {
      builder.afterWindowStart(() => {
        builder.allowKubeResource({ apiName: "statefulsets", group: "apps" });
      });

      rendered = await builder.render();
    });

    it("shows the applications sidebar item", () => {
      expect(rendered.getByTestId("sidebar-item-applications")).toBeInTheDocument();
    });
  });

  describe("given workloads of several applications", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi: di }) => {
        windowDi = di;
        allowWorkloadsAndNetworking(builder);
        putWorkloadsInStores(windowDi);
      });

      rendered = await builder.render();
    });

    it("shows the applications sidebar item right after the cluster overview", () => {
      const sidebarItems = [...rendered.container.querySelectorAll(".tree > [data-testid^='sidebar-item-']")]
        .map(element => element.getAttribute("data-testid"));

      expect(sidebarItems.indexOf("sidebar-item-applications")).toBe(sidebarItems.indexOf("sidebar-item-cluster-overview") + 1);
    });

    describe("when clicking the applications sidebar item", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-applications"));
      });

      it("shows the applications list", () => {
        expect(rendered.getByText("Applications", { selector: "h5" })).toBeInTheDocument();
      });
    });

    describe("when navigating to applications", () => {
      const row = (id: string) => within(rendered.getByTestId(`application-row-for-${id}`));

      beforeEach(() => {
        builder.navigateWith(navigateToApplicationsInjectable);
      });

      it("shows one row per application and namespace", () => {
        const rowIds = [...rendered.container.querySelectorAll("[data-testid^='application-row-for-']")]
          .map(element => element.getAttribute("data-testid")?.replace("application-row-for-", ""))
          .sort();

        expect(rowIds).toEqual([
          "default/billing",
          "default/db-migrate",
          "default/log-agent",
          "default/reports",
          "default/shop",
          "staging/shop",
        ]);
      });

      it("groups the workloads sharing the instance label into one application", () => {
        expect(row("default/shop").getByText("2", { selector: ".workloads" })).toBeInTheDocument();
      });

      it("shows the version and manager of an application", () => {
        expect(row("default/shop").getByText("1.2.0")).toBeInTheDocument();
        expect(row("default/shop").getByText("Helm")).toBeInTheDocument();
      });

      it("takes the version from the helm chart when no version label is set", () => {
        expect(row("default/reports").getByText("2.1.0")).toBeInTheDocument();
      });

      it("recognises applications managed by Argo CD and Flux", () => {
        expect(row("default/billing").getByText("Argo CD")).toBeInTheDocument();
        expect(row("default/log-agent").getByText("Flux")).toBeInTheDocument();
      });

      it("shows the health of each application", () => {
        expect(row("default/shop").getByText("Healthy")).toBeInTheDocument();
        expect(row("default/billing").getByText("Progressing")).toBeInTheDocument();
        expect(row("default/reports").getByText("Degraded")).toBeInTheDocument();
        expect(row("default/db-migrate").getByText("Healthy")).toBeInTheDocument();
      });

      it("explains the health in the badge's tooltip", () => {
        expect(row("default/billing").getByText("Progressing")).toHaveAttribute("title", "1/3 replicas ready");
      });

      it("does not show the jobs created by a cron job as applications", () => {
        expect(rendered.queryByTestId("application-row-for-default/reports-nightly-29000000")).toBeNull();
      });

      describe("when the global namespace filter selects only staging", () => {
        beforeEach(() => {
          builder.namespaces.select("staging");
        });

        it("shows only the applications in staging", () => {
          expect(rendered.getByTestId("application-row-for-staging/shop")).toBeInTheDocument();
          expect(rendered.queryByTestId("application-row-for-default/shop")).toBeNull();
          expect(rendered.queryByTestId("application-row-for-default/billing")).toBeNull();
        });
      });

      describe("when searching for a workload name", () => {
        beforeEach(() => {
          runInAction(() => {
            windowDi.inject(searchUrlPageParamInjectable).set("shop-db");
          });
        });

        it("shows only the applications containing such a workload", () => {
          expect(rendered.getByTestId("application-row-for-default/shop")).toBeInTheDocument();
          expect(rendered.queryByTestId("application-row-for-default/billing")).toBeNull();
          expect(rendered.queryByTestId("application-row-for-staging/shop")).toBeNull();
        });
      });

      describe("when selecting an application", () => {
        const details = () => within(rendered.getByTestId("application-details-for-default/shop"));

        beforeEach(() => {
          fireEvent.click(rendered.getByTestId("application-row-for-default/shop"));
        });

        it("opens the details of the application", () => {
          expect(rendered.getByTestId("application-details-for-default/shop")).toBeInTheDocument();
          expect(details().getByText("Application: shop")).toBeInTheDocument();
        });

        it("shows how the workloads were grouped", () => {
          expect(details().getByText("label app.kubernetes.io/instance")).toBeInTheDocument();
        });

        it("shows the workloads of the application with links to their details", () => {
          const link = details().getByText("shop-db");

          expect(link.tagName).toBe("A");
          expect(link).toHaveAttribute("href", expect.stringContaining(encodeURIComponent("/apis/apps/v1/namespaces/default/statefulsets/shop-db")));
          expect(details().getByText("shop-frontend", { selector: "a[href*='deployments']" })).toBeInTheDocument();
          expect(details().getByText("2/2 ready")).toBeInTheDocument();
        });

        it("shows the services selecting the pods of the workloads", () => {
          expect(details().getByText("shop-frontend", { selector: "a[href*='services']" })).toBeInTheDocument();
          expect(details().queryByText("billing")).toBeNull();
        });

        it("shows the ingresses routing to those services", () => {
          expect(details().getByText("shop", { selector: "a[href*='ingresses']" })).toBeInTheDocument();
          expect(details().getByText("shop.example.com")).toBeInTheDocument();
        });

        it("highlights the selected application in the list", () => {
          expect(rendered.getByTestId("application-row-for-default/shop")).toHaveClass("selected");
        });

        describe("when opening the details of one of its workloads", () => {
          beforeEach(() => {
            windowDi.inject(showDetailsInjectable)("/apis/apps/v1/namespaces/default/statefulsets/shop-db", false);
          });

          it("makes room for the workload's details", () => {
            expect(rendered.queryByTestId("application-details-for-default/shop")).toBeNull();
          });

          describe("when closing the workload's details", () => {
            beforeEach(() => {
              windowDi.inject(hideDetailsInjectable)();
            });

            it("shows the application's details again", () => {
              expect(rendered.getByTestId("application-details-for-default/shop")).toBeInTheDocument();
            });
          });

          describe("when selecting the application again", () => {
            beforeEach(() => {
              fireEvent.click(rendered.getByTestId("application-row-for-default/shop"));
            });

            it("shows the application's details again", () => {
              expect(rendered.getByTestId("application-details-for-default/shop")).toBeInTheDocument();
            });
          });
        });

        describe("when closing the details", () => {
          beforeEach(() => {
            fireEvent.click(rendered.getByTestId("close-application-details"));
          });

          it("closes the details of the application", () => {
            expect(rendered.queryByTestId("application-details-for-default/shop")).toBeNull();
          });
        });

        describe("when selecting the application again", () => {
          beforeEach(() => {
            fireEvent.click(rendered.getByTestId("application-row-for-default/shop"));
          });

          it("closes the details of the application", () => {
            expect(rendered.queryByTestId("application-details-for-default/shop")).toBeNull();
          });
        });
      });

      describe("when selecting a degraded application", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByTestId("application-row-for-default/reports"));
        });

        it("shows why its cron job is degraded", () => {
          expect(rendered.getByText("Last run failed (reports-nightly-29000000)")).toBeInTheDocument();
        });
      });
    });
  });
});
