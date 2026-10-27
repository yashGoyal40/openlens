/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { RenderResult } from "@testing-library/react";
import { fireEvent, within } from "@testing-library/react";
import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { Namespace } from "@k8slens/kube-object";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { renderFor } from "../../renderer/components/test-utils/renderFor";
import navigateToCostMonitoringInjectable from "./common/navigate-to-cost-monitoring.injectable";
import type { RequestOpenCostServices } from "./renderer/request-opencost-services.injectable";
import requestOpenCostServicesInjectable from "./renderer/request-opencost-services.injectable";
import type { RequestOpenCostAllocation } from "./renderer/request-opencost-allocation.injectable";
import requestOpenCostAllocationInjectable from "./renderer/request-opencost-allocation.injectable";
import costMonitoringSettingsInjectable from "./renderer/cost-monitoring-settings.injectable";
import type { OpenCostAllocationResponse } from "./renderer/opencost-allocation";
import { NamespaceCostSummary } from "./renderer/components/namespace-cost-summary";

const discoveredService = { namespace: "opencost", name: "opencost", port: "9003" };

const allocationResponse: OpenCostAllocationResponse = {
  code: 200,
  data: [{
    "kube-system": {
      name: "kube-system",
      properties: { namespace: "kube-system" },
      start: "2026-10-20T00:00:00Z",
      end: "2026-10-27T00:00:00Z",
      cpuCost: 2,
      gpuCost: 0,
      ramCost: 1.5,
      pvCost: 0,
      networkCost: 0,
      loadBalancerCost: 0,
      sharedCost: 0,
      externalCost: 0,
      totalCost: 3.5,
      cpuEfficiency: 0.8,
      ramEfficiency: null,
      totalEfficiency: 0.7,
    },
    default: {
      name: "default",
      properties: { namespace: "default" },
      start: "2026-10-20T00:00:00Z",
      end: "2026-10-27T00:00:00Z",
      cpuCost: 9.5,
      cpuCostAdjustment: 0.5,
      gpuCost: 0,
      ramCost: 5,
      pvCost: 1,
      networkCost: 0.5,
      loadBalancerCost: 0,
      sharedCost: 0,
      externalCost: 0,
      totalCost: 16.5,
      cpuEfficiency: 0.25,
      ramEfficiency: 0.5,
      totalEfficiency: 0.33,
    },
  }],
};

describe("cost monitoring", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let requestOpenCostServicesMock: AsyncFnMock<RequestOpenCostServices>;
  let requestOpenCostAllocationMock: AsyncFnMock<RequestOpenCostAllocation>;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");
    builder.namespaces.add("kube-system");

    requestOpenCostServicesMock = asyncFn();
    requestOpenCostAllocationMock = asyncFn();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(requestOpenCostServicesInjectable, () => requestOpenCostServicesMock);
      windowDi.override(requestOpenCostAllocationInjectable, () => requestOpenCostAllocationMock);
    });
  });

  describe("given services are not allowed", () => {
    beforeEach(async () => {
      rendered = await builder.render();
    });

    it("does not show the cost sidebar item", () => {
      expect(rendered.queryByTestId("sidebar-item-cost-monitoring")).toBeNull();
    });
  });

  describe("given services are allowed", () => {
    beforeEach(async () => {
      builder.afterWindowStart(() => {
        builder.allowKubeResource({ apiName: "services", group: "" });
      });

      rendered = await builder.render();
    });

    it("shows the cost sidebar item", () => {
      expect(rendered.getByTestId("sidebar-item-cost-monitoring")).toHaveTextContent("Cost");
    });

    it("does not look for OpenCost before it is needed", () => {
      expect(requestOpenCostServicesMock).not.toHaveBeenCalled();
    });

    describe("when navigating to the cost page", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToCostMonitoringInjectable);
      });

      it("shows the page", () => {
        expect(rendered.getByTestId("cost-monitoring-page")).toBeInTheDocument();
      });

      it("looks for OpenCost", () => {
        expect(requestOpenCostServicesMock).toHaveBeenCalled();
        expect(rendered.getByTestId("cost-monitoring-loading")).toHaveTextContent("Looking for OpenCost...");
      });

      describe("when OpenCost is not found", () => {
        beforeEach(async () => {
          await requestOpenCostServicesMock.resolve({ callWasSuccessful: true, response: [] });
        });

        it("shows how to install OpenCost", () => {
          expect(rendered.getByTestId("opencost-install-hint")).toHaveTextContent("helm repo add opencost https://opencost.github.io/opencost-helm-chart");
        });

        it("does not request costs", () => {
          expect(requestOpenCostAllocationMock).not.toHaveBeenCalled();
        });

        describe("when configuring the connection from the hint", () => {
          beforeEach(() => {
            fireEvent.click(within(rendered.getByTestId("opencost-install-hint")).getByText("Configure connection"));
            fireEvent.change(rendered.getByTestId("opencost-settings-serviceNamespace"), { target: { value: "monitoring" }});
            fireEvent.change(rendered.getByTestId("opencost-settings-serviceName"), { target: { value: "cost-api" }});
            fireEvent.click(rendered.getByTestId("opencost-settings-save"));
          });

          it("requests costs from the configured service on the default port", () => {
            expect(requestOpenCostAllocationMock).toHaveBeenCalledWith(
              { namespace: "monitoring", name: "cost-api", port: "9003" },
              { window: "7d", aggregate: "namespace" },
            );
          });
        });
      });

      describe("when looking for OpenCost fails", () => {
        beforeEach(async () => {
          await requestOpenCostServicesMock.resolve({ callWasSuccessful: false, error: "services is forbidden" });
        });

        it("shows the error", () => {
          expect(rendered.getByTestId("cost-monitoring-error")).toHaveTextContent("services is forbidden");
        });
      });

      describe("when OpenCost is found", () => {
        beforeEach(async () => {
          await requestOpenCostServicesMock.resolve({ callWasSuccessful: true, response: [discoveredService] });
        });

        it("requests the costs of the last 7 days per namespace through the discovered service", () => {
          expect(requestOpenCostAllocationMock).toHaveBeenCalledWith(discoveredService, { window: "7d", aggregate: "namespace" });
        });

        it("shows where costs come from", () => {
          expect(rendered.getByTestId("cost-monitoring-source")).toHaveTextContent("OpenCost at opencost/opencost:9003");
        });

        it("shows that costs are loading", () => {
          expect(rendered.getByTestId("cost-monitoring-loading")).toHaveTextContent("Loading costs...");
        });

        describe("when costs are received", () => {
          beforeEach(async () => {
            await requestOpenCostAllocationMock.resolve({ callWasSuccessful: true, response: allocationResponse });
          });

          it("shows a row per namespace, the most expensive first", () => {
            const rows = rendered.getAllByTestId(/^cost-allocation-row-/);

            expect(rows.map(row => row.dataset.testid)).toEqual([
              "cost-allocation-row-default",
              "cost-allocation-row-kube-system",
            ]);
          });

          it("shows costs including adjustments, efficiencies and the share of the total", () => {
            const row = within(rendered.getByTestId("cost-allocation-row-default"));

            expect(row.getByText("$10.00")).toBeInTheDocument();
            expect(row.getByText("$5.00")).toBeInTheDocument();
            expect(row.getByText("$16.50")).toBeInTheDocument();
            expect(row.getByText("25.0%")).toBeInTheDocument();
            expect(row.getByText("82.5%")).toBeInTheDocument();
          });

          it("shows efficiencies OpenCost could not compute as unknown", () => {
            const row = within(rendered.getByTestId("cost-allocation-row-kube-system"));

            expect(row.getByText("80.0%")).toBeInTheDocument();
            expect(row.getByText("-")).toBeInTheDocument();
          });

          it("shows the totals", () => {
            const totals = within(rendered.getByTestId("cost-allocation-totals"));

            expect(totals.getByText("Total")).toBeInTheDocument();
            expect(totals.getByText("$12.00")).toBeInTheDocument();
            expect(totals.getByText("$6.50")).toBeInTheDocument();
            expect(totals.getByText("$20.00")).toBeInTheDocument();
            // CPU efficiency weighted by CPU cost
            expect(totals.getByText("34.2%")).toBeInTheDocument();
            expect(totals.getByText("100.0%")).toBeInTheDocument();
          });

          describe("when sorting by CPU efficiency", () => {
            beforeEach(() => {
              fireEvent.click(rendered.getByTestId("cost-allocation-header-cpuEfficiency"));
            });

            it("shows the most efficient first", () => {
              const rows = rendered.getAllByTestId(/^cost-allocation-row-/);

              expect(rows.map(row => row.dataset.testid)).toEqual([
                "cost-allocation-row-kube-system",
                "cost-allocation-row-default",
              ]);
            });
          });

          describe("when sorting by name twice", () => {
            beforeEach(() => {
              fireEvent.click(rendered.getByTestId("cost-allocation-header-name"));
              fireEvent.click(rendered.getByTestId("cost-allocation-header-name"));
            });

            it("shows the rows in reverse alphabetical order", () => {
              const rows = rendered.getAllByTestId(/^cost-allocation-row-/);

              expect(rows.map(row => row.dataset.testid)).toEqual([
                "cost-allocation-row-kube-system",
                "cost-allocation-row-default",
              ]);
            });
          });

          describe("when the label aggregation shows costs without the label", () => {
            beforeEach(async () => {
              fireEvent.click(rendered.getByText("Label"));

              const input = rendered.getByTestId("cost-monitoring-label-key");

              fireEvent.change(input, { target: { value: "team" }});
              fireEvent.keyDown(input, { key: "Enter" });

              await requestOpenCostAllocationMock.resolveSpecific(
                ([, query]) => query.aggregate === "label:team",
                {
                  callWasSuccessful: true,
                  response: {
                    code: 200,
                    data: [{
                      payments: { name: "payments", cpuCost: 4, ramCost: 1, totalCost: 5 },
                      __unallocated__: { name: "__unallocated__", cpuCost: 1, ramCost: 1, totalCost: 2 },
                    }],
                  },
                },
              );
            });

            it("shows a readable name for them", () => {
              expect(within(rendered.getByTestId("cost-allocation-row-__unallocated__")).getByText("Unallocated")).toBeInTheDocument();
            });

            it("shows the totals of all label values", () => {
              expect(within(rendered.getByTestId("cost-allocation-totals")).getByText("$7.00")).toBeInTheDocument();
            });
          });

          describe("when only the kube-system namespace is selected", () => {
            beforeEach(() => {
              builder.namespaces.select("kube-system");
            });

            it("shows only the selected namespace", () => {
              expect(rendered.queryByTestId("cost-allocation-row-default")).toBeNull();
              expect(rendered.getByTestId("cost-allocation-row-kube-system")).toBeInTheDocument();
              expect(rendered.getByTestId("cost-monitoring-filter-summary")).toHaveTextContent("Showing 1 of 2 namespaces");
            });

            it("shows the totals of the selected namespace", () => {
              const totals = within(rendered.getByTestId("cost-allocation-totals"));

              expect(totals.getByText("$3.50")).toBeInTheDocument();
            });
          });
        });

        describe("when OpenCost has no costs for the window", () => {
          beforeEach(async () => {
            await requestOpenCostAllocationMock.resolve({ callWasSuccessful: true, response: { code: 200, data: [{}] }});
          });

          it("shows that there is no data", () => {
            expect(rendered.getByText("OpenCost has no cost data for this window yet.")).toBeInTheDocument();
          });

          it("does not show a table", () => {
            expect(rendered.queryByTestId("cost-allocation-totals")).toBeNull();
          });
        });

        describe("when requesting costs fails", () => {
          beforeEach(async () => {
            await requestOpenCostAllocationMock.resolve({ callWasSuccessful: false, error: "no endpoints available for service \"opencost\"" });
          });

          it("shows the error", () => {
            expect(rendered.getByTestId("cost-monitoring-error")).toHaveTextContent("no endpoints available for service \"opencost\"");
          });

          describe("when retrying", () => {
            beforeEach(() => {
              requestOpenCostAllocationMock.mockClear();
              fireEvent.click(within(rendered.getByTestId("cost-monitoring-error")).getByText("Retry"));
            });

            it("requests the costs again", () => {
              expect(requestOpenCostAllocationMock).toHaveBeenCalledWith(discoveredService, { window: "7d", aggregate: "namespace" });
            });
          });
        });

        describe("when selecting the window of 30 days", () => {
          beforeEach(() => {
            fireEvent.click(rendered.getByText("30 days"));
          });

          it("requests the costs of 30 days", () => {
            expect(requestOpenCostAllocationMock).toHaveBeenLastCalledWith(discoveredService, { window: "30d", aggregate: "namespace" });
          });
        });

        describe("when aggregating by label", () => {
          beforeEach(() => {
            requestOpenCostAllocationMock.mockClear();
            fireEvent.click(rendered.getByText("Label"));
          });

          it("asks for a label key without requesting costs", () => {
            expect(rendered.getByText("Enter a label key to aggregate costs by.")).toBeInTheDocument();
            expect(requestOpenCostAllocationMock).not.toHaveBeenCalled();
          });

          describe("when entering a label key", () => {
            beforeEach(() => {
              const input = rendered.getByTestId("cost-monitoring-label-key");

              fireEvent.change(input, { target: { value: "app" }});
              fireEvent.keyDown(input, { key: "Enter" });
            });

            it("requests the costs per label value", () => {
              expect(requestOpenCostAllocationMock).toHaveBeenCalledWith(discoveredService, { window: "7d", aggregate: "label:app" });
            });
          });
        });

        describe("when configuring the connection", () => {
          beforeEach(() => {
            fireEvent.click(rendered.getByTestId("cost-monitoring-toggle-settings"));
            fireEvent.change(rendered.getByTestId("opencost-settings-serviceNamespace"), { target: { value: "monitoring" }});
            fireEvent.change(rendered.getByTestId("opencost-settings-serviceName"), { target: { value: "cost-api" }});
            fireEvent.change(rendered.getByTestId("opencost-settings-servicePort"), { target: { value: "9090" }});
            fireEvent.change(rendered.getByTestId("opencost-settings-currency"), { target: { value: "eur" }});
            fireEvent.click(rendered.getByTestId("opencost-settings-save"));
          });

          it("requests costs from the configured service", () => {
            expect(requestOpenCostAllocationMock).toHaveBeenLastCalledWith(
              { namespace: "monitoring", name: "cost-api", port: "9090" },
              { window: "7d", aggregate: "namespace" },
            );
          });

          it("shows that the service is configured", () => {
            expect(rendered.getByTestId("cost-monitoring-source")).toHaveTextContent("OpenCost at monitoring/cost-api:9090 (configured)");
          });

          it("stores the connection for the cluster", () => {
            const settings = builder.applicationWindow.only.di.inject(costMonitoringSettingsInjectable);

            expect(settings.get()).toMatchObject({
              serviceNamespace: "monitoring",
              serviceName: "cost-api",
              servicePort: "9090",
              currency: "EUR",
            });
          });

          describe("when costs are received", () => {
            beforeEach(async () => {
              await requestOpenCostAllocationMock.resolveSpecific(
                ([service]) => service.name === "cost-api",
                { callWasSuccessful: true, response: allocationResponse },
              );
            });

            it("formats costs in the configured currency", () => {
              const totals = within(rendered.getByTestId("cost-allocation-totals"));

              expect(totals.getByText("€20.00")).toBeInTheDocument();
            });
          });
        });
      });
    });

    describe("when the cost summary of a namespace is shown", () => {
      let summary: RenderResult;

      beforeEach(() => {
        const render = renderFor(builder.applicationWindow.only.di);
        const namespace = new Namespace({
          apiVersion: "v1",
          kind: "Namespace",
          metadata: {
            name: "default",
            resourceVersion: "1",
            uid: "default-uid",
            selfLink: "/api/v1/namespaces/default",
          },
        });

        summary = render(<NamespaceCostSummary object={namespace} />);
      });

      it("looks for OpenCost", () => {
        expect(requestOpenCostServicesMock).toHaveBeenCalled();
      });

      describe("when OpenCost is not found", () => {
        beforeEach(async () => {
          await requestOpenCostServicesMock.resolve({ callWasSuccessful: true, response: [] });
        });

        it("shows nothing", () => {
          expect(summary.queryByTestId("namespace-cost-summary")).toBeNull();
        });
      });

      describe("when OpenCost is found and costs are received", () => {
        beforeEach(async () => {
          await requestOpenCostServicesMock.resolve({ callWasSuccessful: true, response: [discoveredService] });
          await requestOpenCostAllocationMock.resolve({ callWasSuccessful: true, response: allocationResponse });
        });

        it("requests the costs of the last 7 days per namespace", () => {
          expect(requestOpenCostAllocationMock).toHaveBeenCalledWith(discoveredService, { window: "7d", aggregate: "namespace" });
        });

        it("shows the total cost of the namespace", () => {
          expect(summary.getByTestId("namespace-cost-total")).toHaveTextContent("$16.50");
        });

        it("shows the breakdown of the cost", () => {
          expect(summary.getByTestId("namespace-cost-summary")).toHaveTextContent("CPU $10.00 · RAM $5.00 · PV $1.00 · Network $0.50");
        });
      });
    });
  });
});
