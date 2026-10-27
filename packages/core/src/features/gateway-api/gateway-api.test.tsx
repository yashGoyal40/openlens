/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { HTTPRoute } from "./common/gateway-api-resources";
import { navigateToHttpRoutesInjectable } from "./common/gateway-api-routes.injectable";
import { storeInjectable as httpRoutesStoreInjectable } from "./renderer/http-routes.injectable";

describe("gateway api / http routes", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");
  });

  describe("given the cluster does not serve the gateway api", () => {
    beforeEach(async () => {
      rendered = await builder.render();
    });

    it("does not show the gateway api sidebar group", () => {
      expect(rendered.queryByTestId("sidebar-item-gateway-api")).toBeNull();
    });
  });

  describe("given the cluster serves http routes", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({
          apiName: "httproutes",
          group: "gateway.networking.k8s.io",
        });

        const store = windowDi.inject(httpRoutesStoreInjectable);

        store.items.replace([
          new HTTPRoute({
            apiVersion: "gateway.networking.k8s.io/v1",
            kind: "HTTPRoute",
            metadata: {
              name: "storefront",
              namespace: "default",
              resourceVersion: "1",
              uid: "storefront-uid",
              selfLink: "/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes/storefront",
            },
            spec: {
              parentRefs: [{ name: "public-gateway" }],
              hostnames: ["shop.example.com"],
              rules: [{
                matches: [{ path: { type: "PathPrefix", value: "/" }}],
                backendRefs: [{ name: "storefront", port: 8080 }],
              }],
            },
            status: {
              parents: [{
                parentRef: { name: "public-gateway" },
                controllerName: "example.com/gateway-controller",
                conditions: [
                  { type: "Accepted", status: "True" },
                  { type: "ResolvedRefs", status: "True" },
                ],
              }],
            },
          }),
        ]);
        store.isLoaded = true;
      });

      rendered = await builder.render();
    });

    describe("when the network sidebar item is expanded", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-network"));
      });

      it("shows the gateway api sidebar group", () => {
        expect(rendered.getByTestId("sidebar-item-gateway-api")).toBeInTheDocument();
      });

      describe("when the gateway api sidebar group is expanded", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByTestId("link-for-sidebar-item-gateway-api"));
        });

        it("shows http routes, but not kinds the cluster does not serve", () => {
          expect(rendered.getByTestId("sidebar-item-gateway-api-http-routes")).toBeInTheDocument();
          expect(rendered.queryByTestId("sidebar-item-gateway-api-tcp-routes")).toBeNull();
        });
      });
    });

    describe("when navigating to http routes", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToHttpRoutesInjectable);
      });

      it("shows the list title", () => {
        expect(rendered.getByText("HTTP Routes", { selector: "h5" })).toBeInTheDocument();
      });

      it("shows the route with its hostnames, parent and status", () => {
        expect(rendered.getByText("storefront")).toBeInTheDocument();
        expect(rendered.getByText("shop.example.com")).toBeInTheDocument();
        expect(rendered.getByText("public-gateway")).toBeInTheDocument();
        expect(rendered.getByText("Accepted")).toBeInTheDocument();
      });
    });
  });
});
