/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import showDetailsInjectable from "../../../renderer/components/kube-detail-params/show-details.injectable";
import { FluxGitRepository, FluxKustomization } from "./common/flux-resources";
import { navigateToFluxGitRepositoriesInjectable, navigateToFluxKustomizationsInjectable } from "./common/flux-routes.injectable";
import { storeInjectable as kustomizationsStoreInjectable } from "./renderer/kustomizations.injectable";
import { storeInjectable as gitRepositoriesStoreInjectable } from "./renderer/git-repositories.injectable";
import { parseInventoryEntry } from "./renderer/flux-view-helpers";

const appsSelfLink = "/apis/kustomize.toolkit.fluxcd.io/v1/namespaces/flux-system/kustomizations/apps";

describe("gitops / flux", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("flux-system");
  });

  describe("given the cluster serves kustomizations and git repositories", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({
          apiName: "kustomizations",
          group: "kustomize.toolkit.fluxcd.io",
        });
        builder.allowKubeResource({
          apiName: "gitrepositories",
          group: "source.toolkit.fluxcd.io",
        });

        const kustomizationsStore = windowDi.inject(kustomizationsStoreInjectable);

        kustomizationsStore.items.replace([
          new FluxKustomization({
            apiVersion: "kustomize.toolkit.fluxcd.io/v1",
            kind: "Kustomization",
            metadata: {
              name: "apps",
              namespace: "flux-system",
              resourceVersion: "1",
              uid: "apps-uid",
              selfLink: appsSelfLink,
            },
            spec: {
              interval: "10m",
              path: "./clusters/production/apps",
              prune: true,
              sourceRef: { kind: "GitRepository", name: "fleet-infra" },
              dependsOn: [{ name: "infrastructure" }],
            },
            status: {
              conditions: [
                {
                  type: "Ready",
                  status: "False",
                  reason: "HealthCheckFailed",
                  message: "timeout waiting for: [Deployment/podinfo/frontend status: 'InProgress']",
                },
                { type: "Healthy", status: "False", reason: "HealthCheckFailed" },
              ],
              lastAppliedRevision: "main@sha1:2c6c4b2f6b1c2d0e9f2a8f0b3c1d4e5f6a7b8c9d",
              inventory: {
                entries: [
                  { id: "podinfo_frontend_apps_Deployment", v: "v1" },
                  { id: "podinfo_frontend__Service", v: "v1" },
                  { id: "_podinfo__Namespace", v: "v1" },
                ],
              },
            },
          }),
        ]);
        kustomizationsStore.isLoaded = true;

        const gitRepositoriesStore = windowDi.inject(gitRepositoriesStoreInjectable);

        gitRepositoriesStore.items.replace([
          new FluxGitRepository({
            apiVersion: "source.toolkit.fluxcd.io/v1",
            kind: "GitRepository",
            metadata: {
              name: "fleet-infra",
              namespace: "flux-system",
              resourceVersion: "1",
              uid: "fleet-infra-uid",
              selfLink: "/apis/source.toolkit.fluxcd.io/v1/namespaces/flux-system/gitrepositories/fleet-infra",
            },
            spec: {
              url: "ssh://git@github.com/example/fleet-infra",
              interval: "1m",
              ref: { branch: "main" },
              suspend: true,
            },
            status: {
              conditions: [{
                type: "Ready",
                status: "True",
                reason: "Succeeded",
                message: "stored artifact for revision 'main@sha1:2c6c4b2f'",
              }],
              artifact: {
                revision: "main@sha1:2c6c4b2f6b1c2d0e9f2a8f0b3c1d4e5f6a7b8c9d",
                digest: "sha256:0b1d2c3e",
                lastUpdateTime: "2026-10-27T10:00:00Z",
              },
            },
          }),
        ]);
        gitRepositoriesStore.isLoaded = true;
      });

      rendered = await builder.render();
    });

    describe("when the gitops and flux sidebar groups are expanded", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-gitops"));
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-gitops-flux"));
      });

      it("does not show the argo cd group", () => {
        expect(rendered.queryByTestId("sidebar-item-gitops-argo-cd")).toBeNull();
      });

      it("shows kustomizations and git repositories, but not kinds the cluster does not serve", () => {
        expect(rendered.getByTestId("sidebar-item-gitops-flux-kustomizations")).toBeInTheDocument();
        expect(rendered.getByTestId("sidebar-item-gitops-flux-git-repositories")).toBeInTheDocument();
        expect(rendered.queryByTestId("sidebar-item-gitops-flux-helm-releases")).toBeNull();
        expect(rendered.queryByTestId("sidebar-item-gitops-flux-buckets")).toBeNull();
      });
    });

    describe("when navigating to kustomizations", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToFluxKustomizationsInjectable);
      });

      it("shows the list title", () => {
        expect(rendered.getByText("Kustomizations", { selector: "h5" })).toBeInTheDocument();
      });

      it("shows the kustomization with its source, path, revision, interval and ready status", () => {
        expect(rendered.getByText("apps")).toBeInTheDocument();
        expect(rendered.getByText("GitRepository fleet-infra").closest("a")).not.toBeNull();
        expect(rendered.getByText("./clusters/production/apps")).toBeInTheDocument();
        expect(rendered.getByText("main@sha1:2c6c4b2f6b1c")).toBeInTheDocument();
        expect(rendered.getByText("10m")).toBeInTheDocument();
        expect(rendered.getByText("HealthCheckFailed")).toHaveAttribute(
          "title",
          "timeout waiting for: [Deployment/podinfo/frontend status: 'InProgress']",
        );
      });

      describe("when the details of the kustomization are opened", () => {
        beforeEach(async () => {
          builder.applicationWindow.only.di.inject(showDetailsInjectable)(appsSelfLink, false);
          await rendered.findByText("Inventory (3)");
        });

        it("shows the inventory, linking to the applied objects", () => {
          expect(rendered.getByText("apps/v1")).toBeInTheDocument();
          expect(rendered.getAllByText("podinfo/frontend").map(element => element.closest("a"))).not.toContain(null);
        });

        it("shows the kustomizations it depends on", () => {
          expect(rendered.getByText("infrastructure")).toBeInTheDocument();
        });
      });
    });

    describe("when navigating to git repositories", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToFluxGitRepositoriesInjectable);
      });

      it("shows the repository with its url, ref, artifact revision and suspension", () => {
        expect(rendered.getByText("fleet-infra")).toBeInTheDocument();
        expect(rendered.getByText("ssh://git@github.com/example/fleet-infra")).toBeInTheDocument();
        expect(rendered.getByText("branch main")).toBeInTheDocument();
        expect(rendered.getByText("main@sha1:2c6c4b2f6b1c")).toBeInTheDocument();
        expect(rendered.getByText("Succeeded")).toBeInTheDocument();
        expect(rendered.getByText("Yes")).toBeInTheDocument();
      });
    });
  });
});

describe("gitops / flux / parseInventoryEntry", () => {
  it("parses namespaced objects of core and named groups", () => {
    expect(parseInventoryEntry({ id: "podinfo_frontend_apps_Deployment", v: "v1" })).toEqual({
      namespace: "podinfo",
      name: "frontend",
      group: "apps",
      kind: "Deployment",
      version: "v1",
    });
    expect(parseInventoryEntry({ id: "podinfo_frontend__Service", v: "v1" })).toEqual({
      namespace: "podinfo",
      name: "frontend",
      group: "",
      kind: "Service",
      version: "v1",
    });
  });

  it("parses cluster scoped objects, decoding colons in their names", () => {
    expect(parseInventoryEntry({ id: "_system__controller_rbac.authorization.k8s.io_ClusterRole", v: "v1" })).toEqual({
      namespace: undefined,
      name: "system:controller",
      group: "rbac.authorization.k8s.io",
      kind: "ClusterRole",
      version: "v1",
    });
  });

  it("ignores malformed ids", () => {
    expect(parseInventoryEntry({ id: "frontend_Deployment", v: "v1" })).toBeUndefined();
  });
});
