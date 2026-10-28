/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("cluster - navigator", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;

  beforeEach(async () => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.afterWindowStart(() => {
      builder.allowKubeResource({ apiName: "pods", group: "" });
      builder.allowKubeResource({ apiName: "deployments", group: "apps" });
      builder.allowKubeResource({ apiName: "services", group: "" });
    });

    result = await builder.render();
  });

  it("is titled Navigator", () => {
    expect(result.getByTestId("cluster-sidebar")).toHaveTextContent("Navigator");
  });

  it("marks new views", () => {
    expect(result.getByTestId("new-badge-for-sidebar-item-cost-monitoring")).toHaveTextContent("NEW");
  });

  it("does not mark existing views", () => {
    expect(result.queryByTestId("new-badge-for-sidebar-item-workloads")).not.toBeInTheDocument();
  });

  describe("when filtering the navigator", () => {
    beforeEach(() => {
      fireEvent.click(result.getByTestId("navigator-filter-toggle"));
      fireEvent.change(result.getByTestId("navigator-filter-input"), { target: { value: "deploy" }});
    });

    it("shows matching views with their group expanded", () => {
      expect(result.getByTestId("sidebar-item-workloads")).toBeInTheDocument();
      expect(result.getByTestId("sidebar-item-deployments")).toBeInTheDocument();
    });

    it("hides views that do not match", () => {
      expect(result.queryByTestId("sidebar-item-pods")).not.toBeInTheDocument();
      expect(result.queryByTestId("sidebar-item-network")).not.toBeInTheDocument();
    });

    describe("when nothing matches", () => {
      beforeEach(() => {
        fireEvent.change(result.getByTestId("navigator-filter-input"), { target: { value: "no-such-view" }});
      });

      it("says so", () => {
        expect(result.getByTestId("navigator-no-matches")).toHaveTextContent('No matches for "no-such-view"');
      });
    });

    describe("when the filter is closed", () => {
      beforeEach(() => {
        fireEvent.click(result.getByTestId("navigator-filter-toggle"));
      });

      it("shows all views again, with groups collapsed", () => {
        expect(result.getByTestId("sidebar-item-network")).toBeInTheDocument();
        expect(result.queryByTestId("sidebar-item-deployments")).not.toBeInTheDocument();
      });
    });
  });
});
