/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RenderResult } from "@testing-library/react";
import { act, fireEvent } from "@testing-library/react";
import type { DiContainer } from "@ogre-tools/injectable";
import type { PodMetrics, PodStatus } from "@k8slens/kube-object";
import { Pod } from "@k8slens/kube-object";
import type { PodMetricsApi } from "@k8slens/kube-api";
import { podMetricsApiInjectable } from "@k8slens/kube-api-specifics";
import navigateToPodsInjectable from "../../common/front-end-routing/routes/cluster/workloads/pods/navigate-to-pods.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import podStoreInjectable from "../../renderer/components/workloads-pods/store.injectable";
import type { RequestMetrics } from "../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import requestMetricsInjectable from "../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import openSaveFileDialogInjectable from "../../renderer/utils/save-file.injectable";
import toggleTableColumnVisibilityInjectable from "../user-preferences/common/toggle-table-column-visibility.injectable";
import tableModelInjectable from "../../renderer/components/table/table-model/table-model.injectable";
import searchUrlPageParamInjectable from "../../renderer/components/input/search-url-page-param.injectable";

// The global test setup renders tooltip contents inline which would end up in the exported texts,
// use the real implementation (tooltips which are not shown render nothing) instead.
jest.unmock("@k8slens/tooltip");

const createPod = (name: string, namespace: string, uid: string) => new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name,
    namespace,
    resourceVersion: "irrelevant",
    selfLink: `/api/v1/namespaces/${namespace}/pods/${name}`,
    uid,
  },
  spec: {
    containers: [{ name: "container-1" }],
    nodeName: "some-node",
  },
  status: {
    phase: "Running",
    qosClass: "BestEffort",
  } as PodStatus,
});

describe("exporting resource lists to CSV", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let windowDi: DiContainer;
  let openSaveFileDialogMock: jest.Mock;
  const podMetrics: PodMetrics[] = [];

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");
    builder.namespaces.add("kube-system");

    openSaveFileDialogMock = jest.fn();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(podMetricsApiInjectable, () => ({
        list: async () => Promise.resolve(podMetrics),
      } as PodMetricsApi));
      windowDi.override(openSaveFileDialogInjectable, () => openSaveFileDialogMock);
    });

    builder.afterWindowStart(({ windowDi }) => {
      builder.allowKubeResource({
        apiName: "pods",
        group: "",
      });

      windowDi.override(requestMetricsInjectable, () => (() => Promise.resolve({})) as unknown as RequestMetrics);

      const podStore = windowDi.inject(podStoreInjectable);

      podStore.items.replace([
        createPod("pod-b", "default", "uuid-b"),
        createPod("=pod-a", "kube-system", "uuid-a"),
      ]);
      podStore.isLoaded = true;
    });
  });

  describe("when navigated to the pods list", () => {
    beforeEach(async () => {
      rendered = await builder.render();
      windowDi = builder.applicationWindow.only.di;
      builder.navigateWith(navigateToPodsInjectable);
    });

    it("shows the export to CSV button", () => {
      expect(rendered.getByTestId("item-list-layout-export-to-csv")).toBeInTheDocument();
    });

    describe("when clicking the export to CSV button", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("item-list-layout-export-to-csv"));
      });

      it("opens the save file dialog with a timestamped file name and CSV content type", () => {
        expect(openSaveFileDialogMock).toHaveBeenCalledWith(
          expect.stringMatching(/^workloads_pods-\d{8}-\d{6}\.csv$/),
          expect.any(String),
          "text/csv",
        );
      });

      it("exports titled columns and the displayed items as text", () => {
        const [, csv] = openSaveFileDialogMock.mock.calls[0];

        expect(csv).toBe([
          "Name,Namespace,CPU,Memory,Containers,Restarts,Controlled By,Node,Node Pool,Instance Type,QoS,Status,Age",
          "pod-b,default,,,,0,,some-node,,,BestEffort,Running,<unknown>",
          "'=pod-a,kube-system,,,,0,,some-node,,,BestEffort,Running,<unknown>",
        ].join("\r\n"));
      });
    });

    describe("given a column is hidden and sorting by name descending", () => {
      beforeEach(() => {
        const toggleTableColumnVisibility = windowDi.inject(toggleTableColumnVisibilityInjectable);
        const tableModel = windowDi.inject(tableModelInjectable);

        toggleTableColumnVisibility("workloads_pods", "namespace");
        tableModel.setSortParams("workloads_pods", { sortBy: "name", orderBy: "desc" });
      });

      describe("when clicking the export to CSV button", () => {
        let csvRows: string[];

        beforeEach(() => {
          fireEvent.click(rendered.getByTestId("item-list-layout-export-to-csv"));
          csvRows = (openSaveFileDialogMock.mock.calls[0][1] as string).split("\r\n");
        });

        it("doesn't export the hidden column", () => {
          expect(csvRows[0]).not.toContain("Namespace");
          expect(csvRows[0]).toMatch(/^Name,/);
        });

        it("exports the items sorted as displayed", () => {
          expect(csvRows.slice(1).map(row => row.split(",")[0])).toEqual(["pod-b", "'=pod-a"]);
        });
      });
    });

    describe("given the list is filtered by a search", () => {
      beforeEach(() => {
        act(() => windowDi.inject(searchUrlPageParamInjectable).set("pod-b"));
      });

      describe("when clicking the export to CSV button", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByTestId("item-list-layout-export-to-csv"));
        });

        it("exports only the matching items", () => {
          const csvRows = (openSaveFileDialogMock.mock.calls[0][1] as string).split("\r\n");

          expect(csvRows).toHaveLength(2);
          expect(csvRows[1]).toMatch(/^pod-b,/);
        });
      });
    });
  });
});
