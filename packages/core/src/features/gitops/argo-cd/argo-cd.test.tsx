/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import showDetailsInjectable from "../../../renderer/components/kube-detail-params/show-details.injectable";
import { ArgoApplication } from "./common/argo-cd-resources";
import { navigateToArgoApplicationsInjectable } from "./common/argo-cd-routes.injectable";
import { storeInjectable as applicationsStoreInjectable } from "./renderer/applications.injectable";

const guestbookSelfLink = "/apis/argoproj.io/v1alpha1/namespaces/argocd/applications/guestbook";

describe("gitops / argo cd applications", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("argocd");
  });

  describe("given the cluster serves neither argo cd nor flux", () => {
    beforeEach(async () => {
      rendered = await builder.render();
    });

    it("does not show the gitops sidebar group", () => {
      expect(rendered.queryByTestId("sidebar-item-gitops")).toBeNull();
    });
  });

  describe("given the cluster serves argo cd applications", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({
          apiName: "applications",
          group: "argoproj.io",
        });

        const store = windowDi.inject(applicationsStoreInjectable);

        store.items.replace([
          new ArgoApplication({
            apiVersion: "argoproj.io/v1alpha1",
            kind: "Application",
            metadata: {
              name: "guestbook",
              namespace: "argocd",
              resourceVersion: "1",
              uid: "guestbook-uid",
              selfLink: guestbookSelfLink,
            },
            spec: {
              project: "storefront",
              source: {
                repoURL: "https://github.com/argoproj/argocd-example-apps.git",
                path: "guestbook",
                targetRevision: "HEAD",
              },
              destination: {
                server: "https://kubernetes.default.svc",
                namespace: "guestbook",
              },
              syncPolicy: {
                automated: { prune: true, selfHeal: true },
                syncOptions: ["CreateNamespace=true"],
              },
            },
            status: {
              sync: { status: "OutOfSync", revision: "53e28ff20cc530b9ada2173fbbd64d48338583ba" },
              health: { status: "Degraded" },
              resources: [{
                group: "apps",
                version: "v1",
                kind: "Deployment",
                namespace: "guestbook",
                name: "guestbook-ui",
                status: "OutOfSync",
                health: { status: "Degraded", message: "Deployment exceeded its progress deadline" },
              }],
              conditions: [{
                type: "SyncError",
                message: "Failed to sync after 5 attempts",
                lastTransitionTime: "2026-10-27T10:00:00Z",
              }],
              operationState: {
                phase: "Failed",
                message: "one or more objects failed to apply",
                startedAt: "2026-10-27T09:58:00Z",
                finishedAt: "2026-10-27T10:00:00Z",
              },
              history: [{
                id: 1,
                revision: "0c1e4d7d6ca2e2e7cc2a5cb6d0a7b0c3f1b9f001",
                deployedAt: "2026-10-26T10:00:00Z",
              }],
            },
          }),
        ]);
        store.isLoaded = true;
      });

      rendered = await builder.render();
    });

    describe("when the gitops sidebar group is expanded", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-gitops"));
      });

      it("shows the argo cd group, but not the flux group", () => {
        expect(rendered.getByTestId("sidebar-item-gitops-argo-cd")).toBeInTheDocument();
        expect(rendered.queryByTestId("sidebar-item-gitops-flux")).toBeNull();
      });

      describe("when the argo cd group is expanded", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByTestId("link-for-sidebar-item-gitops-argo-cd"));
        });

        it("shows applications, but not kinds the cluster does not serve", () => {
          expect(rendered.getByTestId("sidebar-item-gitops-argo-cd-applications")).toBeInTheDocument();
          expect(rendered.queryByTestId("sidebar-item-gitops-argo-cd-application-sets")).toBeNull();
          expect(rendered.queryByTestId("sidebar-item-gitops-argo-cd-app-projects")).toBeNull();
        });
      });
    });

    describe("when navigating to applications", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToArgoApplicationsInjectable);
      });

      it("shows the list title", () => {
        expect(rendered.getByText("Applications", { selector: "h5" })).toBeInTheDocument();
      });

      it("shows the application with its project, sync and health status, source and destination", () => {
        expect(rendered.getByText("guestbook")).toBeInTheDocument();
        expect(rendered.getByText("storefront")).toBeInTheDocument();
        expect(rendered.getByText("OutOfSync")).toBeInTheDocument();
        expect(rendered.getByText("Degraded")).toBeInTheDocument();
        expect(rendered.getByText("https://github.com/argoproj/argocd-example-apps.git guestbook @ HEAD")).toBeInTheDocument();
        expect(rendered.getByText("https://kubernetes.default.svc/guestbook")).toBeInTheDocument();
      });

      describe("when the details of the application are opened", () => {
        beforeEach(async () => {
          builder.applicationWindow.only.di.inject(showDetailsInjectable)(guestbookSelfLink, false);
          await rendered.findByText("Resources");
        });

        it("shows the sync policy", () => {
          expect(rendered.getByText("Automated (prune, self-heal)")).toBeInTheDocument();
          expect(rendered.getByText("CreateNamespace=true")).toBeInTheDocument();
        });

        it("shows the managed resources with links to them", () => {
          expect(rendered.getByText("guestbook/guestbook-ui").closest("a")).not.toBeNull();
        });

        it("shows the argo cd conditions with their message", () => {
          expect(rendered.getByText("SyncError")).toBeInTheDocument();
          expect(rendered.getByText("Failed to sync after 5 attempts")).toBeInTheDocument();
        });

        it("shows the operation state", () => {
          expect(rendered.getByText("Failed")).toBeInTheDocument();
        });
      });
    });
  });
});
