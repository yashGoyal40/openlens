/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { ResourceClaim, ResourceSlice } from "./common/dynamic-resource-allocation-resources";
import { navigateToResourceClaimsInjectable, navigateToResourceSlicesInjectable } from "./common/dynamic-resource-allocation-routes.injectable";
import { storeInjectable as resourceClaimsStoreInjectable } from "./renderer/resource-claims.injectable";
import { storeInjectable as resourceSlicesStoreInjectable } from "./renderer/resource-slices.injectable";

describe("dynamic resource allocation", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");
  });

  describe("given the cluster does not serve resource.k8s.io", () => {
    beforeEach(async () => {
      rendered = await builder.render();
    });

    it("does not show the dynamic resources sidebar group", () => {
      expect(rendered.queryByTestId("sidebar-item-dynamic-resource-allocation")).toBeNull();
    });
  });

  describe("given the cluster serves resource claims", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({
          apiName: "resourceclaims",
          group: "resource.k8s.io",
        });

        const store = windowDi.inject(resourceClaimsStoreInjectable);

        store.items.replace([
          new ResourceClaim({
            apiVersion: "resource.k8s.io/v1",
            kind: "ResourceClaim",
            metadata: {
              name: "training-gpus",
              namespace: "default",
              resourceVersion: "1",
              uid: "training-gpus-uid",
              selfLink: "/apis/resource.k8s.io/v1/namespaces/default/resourceclaims/training-gpus",
            },
            spec: {
              devices: {
                requests: [{
                  name: "gpus",
                  exactly: {
                    deviceClassName: "gpu.example.com",
                    allocationMode: "ExactCount",
                    count: 2,
                  },
                }],
              },
            },
            status: {
              allocation: {
                devices: {
                  results: [
                    { request: "gpus", driver: "gpu.example.com", pool: "worker-1", device: "gpu-0" },
                    { request: "gpus", driver: "gpu.example.com", pool: "worker-1", device: "gpu-1" },
                  ],
                },
              },
              reservedFor: [{ resource: "pods", name: "trainer-0", uid: "trainer-0-uid" }],
            },
          }),
          new ResourceClaim({
            apiVersion: "resource.k8s.io/v1beta1",
            kind: "ResourceClaim",
            metadata: {
              name: "legacy-nic",
              namespace: "default",
              resourceVersion: "1",
              uid: "legacy-nic-uid",
              selfLink: "/apis/resource.k8s.io/v1beta1/namespaces/default/resourceclaims/legacy-nic",
            },
            spec: {
              devices: {
                requests: [{
                  name: "nic",
                  deviceClassName: "nic.example.com",
                  allocationMode: "All",
                }],
              },
            },
          }),
        ]);
        store.isLoaded = true;
      });

      rendered = await builder.render();
    });

    it("shows the device resources sidebar group at the top level", () => {
      const group = rendered.getByTestId("sidebar-item-dynamic-resource-allocation");

      expect(group).toHaveTextContent("Device Resources");
      expect(group.dataset.parentIdTest).toBeUndefined();
    });

    describe("when the device resources sidebar group is expanded", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-dynamic-resource-allocation"));
      });

      it("shows resource claims, but not kinds the cluster does not serve", () => {
        expect(rendered.getByTestId("sidebar-item-dynamic-resource-allocation-resource-claims")).toBeInTheDocument();
        expect(rendered.queryByTestId("sidebar-item-dynamic-resource-allocation-resource-slices")).toBeNull();
      });
    });

    describe("when navigating to resource claims", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToResourceClaimsInjectable);
      });

      it("shows the list title", () => {
        expect(rendered.getByText("Resource Claims", { selector: "h5" })).toBeInTheDocument();
      });

      it("shows an allocated claim with its state, requests and allocated devices", () => {
        expect(rendered.getByText("training-gpus")).toBeInTheDocument();
        expect(rendered.getByText("Reserved")).toBeInTheDocument();
        expect(rendered.getByText("2 × gpu.example.com")).toBeInTheDocument();
        expect(rendered.getByText("gpu-0, gpu-1")).toBeInTheDocument();
      });

      it("shows a pending claim using the v1beta1 request shape", () => {
        expect(rendered.getByText("legacy-nic")).toBeInTheDocument();
        expect(rendered.getByText("Pending")).toBeInTheDocument();
        expect(rendered.getByText("all nic.example.com")).toBeInTheDocument();
      });

      describe("when the details of the allocated claim are opened", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByText("training-gpus"));
        });

        it("shows the allocation results", () => {
          expect(rendered.getByText("Allocated Devices", { selector: ".DrawerTitle" })).toBeInTheDocument();
          expect(rendered.getAllByText("gpu-0")).not.toHaveLength(0);
        });

        it("shows the consumers the claim is reserved for", () => {
          expect(rendered.getByText("Reserved For", { selector: ".DrawerTitle" })).toBeInTheDocument();
          expect(rendered.getByText("trainer-0")).toBeInTheDocument();
        });
      });
    });
  });

  describe("given the cluster serves resource slices", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({
          apiName: "resourceslices",
          group: "resource.k8s.io",
        });

        const store = windowDi.inject(resourceSlicesStoreInjectable);

        store.items.replace([
          new ResourceSlice({
            apiVersion: "resource.k8s.io/v1",
            kind: "ResourceSlice",
            metadata: {
              name: "worker-1-gpu.example.com-x7k2p",
              resourceVersion: "1",
              uid: "slice-uid",
              selfLink: "/apis/resource.k8s.io/v1/resourceslices/worker-1-gpu.example.com-x7k2p",
            },
            spec: {
              driver: "gpu.example.com",
              nodeName: "worker-1",
              pool: { name: "worker-1-pool", generation: 1, resourceSliceCount: 1 },
              devices: [
                { name: "gpu-0", attributes: { model: { string: "A100" }}, capacity: { memory: { value: "40Gi" }}},
                { name: "gpu-1", attributes: { model: { string: "A100" }}, capacity: { memory: { value: "40Gi" }}},
                { name: "gpu-2", basic: { attributes: { model: { string: "A100" }}}},
              ],
            },
          }),
        ]);
        store.isLoaded = true;
      });

      rendered = await builder.render();
      builder.navigateWith(navigateToResourceSlicesInjectable);
    });

    it("shows the slice with its driver, node, pool and device count", () => {
      expect(rendered.getByText("Resource Slices", { selector: "h5" })).toBeInTheDocument();
      expect(rendered.getByText("worker-1-gpu.example.com-x7k2p")).toBeInTheDocument();
      expect(rendered.getByText("gpu.example.com")).toBeInTheDocument();
      expect(rendered.getByText("worker-1")).toBeInTheDocument();
      expect(rendered.getByText("worker-1-pool")).toBeInTheDocument();
      expect(rendered.getByText("3")).toBeInTheDocument();
    });
  });
});
