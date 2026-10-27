/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { act, fireEvent } from "@testing-library/react";
import type { DiContainer } from "@ogre-tools/injectable";
import type { PodStatus } from "@k8slens/kube-object";
import { Pod } from "@k8slens/kube-object";
import type { PodMetricsApi } from "@k8slens/kube-api";
import { podMetricsApiInjectable } from "@k8slens/kube-api-specifics";
import navigateToPodsInjectable from "../../../common/front-end-routing/routes/cluster/workloads/pods/navigate-to-pods.injectable";
import type { ApplicationBuilder } from "../test-utils/get-application-builder";
import { getApplicationBuilder } from "../test-utils/get-application-builder";
import podStoreInjectable from "../workloads-pods/store.injectable";
import type { RequestMetrics } from "../../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import requestMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import { advanceFakeTime } from "../../../test-utils/use-fake-time";
import tableColumnWidthsInjectable from "./table-column-widths.injectable";

const createPod = (name: string) => new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name,
    namespace: "default",
    resourceVersion: "irrelevant",
    selfLink: `/api/v1/namespaces/default/pods/${name}`,
    uid: `${name}-uid`,
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

describe("resizing list columns", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let windowDi: DiContainer;

  const getNameCells = () => [...rendered.baseElement.querySelectorAll<HTMLElement>(".TableCell.name")];
  const getNameAnchor = () => rendered.getByTestId("column-resize-anchor-name").querySelector(".ResizingAnchor") as HTMLElement;

  beforeEach(async () => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
    builder.namespaces.add("default");

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(podMetricsApiInjectable, () => ({
        list: async () => Promise.resolve([]),
      } as unknown as PodMetricsApi));
    });

    builder.afterWindowStart(({ windowDi }) => {
      builder.allowKubeResource({
        apiName: "pods",
        group: "",
      });

      windowDi.override(requestMetricsInjectable, () => (() => Promise.resolve({})) as unknown as RequestMetrics);

      const podStore = windowDi.inject(podStoreInjectable);

      podStore.items.replace([createPod("pod-a"), createPod("pod-b")]);
      podStore.isLoaded = true;
    });

    rendered = await builder.render();
    windowDi = builder.applicationWindow.only.di;
    builder.navigateWith(navigateToPodsInjectable);
  });

  it("offers a resize handle on the column headers", () => {
    expect(rendered.getByTestId("column-resize-anchor-name")).toBeInTheDocument();
    expect(rendered.getByTestId("column-resize-anchor-namespace")).toBeInTheDocument();
  });

  it("uses the flexible default width until a column is resized", () => {
    expect(getNameCells().map(cell => cell.style.flex)).toEqual(["", "", ""]);
  });

  describe("given a stored width for the name column", () => {
    beforeEach(() => {
      act(() => {
        windowDi.inject(tableColumnWidthsInjectable).merge({ workloads_pods: { name: 320 }});
      });
    });

    it("gives the header and every row cell of the column that width", () => {
      expect(getNameCells().map(cell => cell.style.flex)).toEqual(["0 0 320px", "0 0 320px", "0 0 320px"]);
    });

    it("leaves other columns flexible", () => {
      expect(rendered.baseElement.querySelector<HTMLElement>(".TableCell.namespace")?.style.flex).toBe("");
    });

    it("when double clicking the handle, resets the column to its default width", () => {
      fireEvent.doubleClick(getNameAnchor());

      expect(getNameCells().map(cell => cell.style.flex)).toEqual(["", "", ""]);
      expect(windowDi.inject(tableColumnWidthsInjectable).get().workloads_pods?.name).toBeUndefined();
    });
  });

  it("still sorts when the header itself is clicked", () => {
    const getSortIcon = () => rendered.baseElement.querySelector(".TableHead .TableCell.name .sortIcon")?.outerHTML;
    const sortIconBefore = getSortIcon();

    fireEvent.click(rendered.baseElement.querySelector(".TableHead .TableCell.name") as HTMLElement);

    expect(getSortIcon()).not.toBe(sortIconBefore);
  });

  it("when dragging the handle, stores the new width without sorting the column", () => {
    const getSortIcon = () => rendered.baseElement.querySelector(".TableHead .TableCell.name .sortIcon")?.outerHTML;
    const sortIconBefore = getSortIcon();
    // the jsdom of the test environment does not support pageX, which the anchor measures drags with
    const moveMouseTo = (pageX: number) => {
      const event = new MouseEvent("mousemove", { bubbles: true });

      Object.defineProperty(event, "pageX", { value: pageX });
      document.dispatchEvent(event);
    };

    fireEvent.mouseDown(getNameAnchor());
    moveMouseTo(0);
    moveMouseTo(180);
    advanceFakeTime(200);
    fireEvent.mouseUp(document);
    fireEvent.click(rendered.baseElement.querySelector(".TableHead .TableCell.name") as HTMLElement);
    advanceFakeTime(10);

    expect(windowDi.inject(tableColumnWidthsInjectable).get().workloads_pods?.name).toBe(180);
    expect(getNameCells().map(cell => cell.style.flex)).toEqual(["0 0 180px", "0 0 180px", "0 0 180px"]);
    expect(getSortIcon()).toBe(sortIconBefore);
  });
});
