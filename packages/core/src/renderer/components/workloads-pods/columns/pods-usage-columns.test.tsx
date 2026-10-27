/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { render } from "@testing-library/react";
import { observable } from "mobx";
import { createContainer } from "@ogre-tools/injectable";
import { Pod } from "@k8slens/kube-object";
import podStoreInjectable from "../store.injectable";
import { podsCpuColumnInjectable, podsMemoryColumnInjectable } from "./pods-usage-columns.injectable";

const createPod = (name: string) => new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name,
    namespace: "default",
    uid: `${name}-uid`,
    resourceVersion: "1",
    selfLink: `/api/v1/namespaces/default/pods/${name}`,
  },
});

describe("pod usage columns", () => {
  const renderColumns = (pod: Pod) => {
    const di = createContainer("some-container");

    di.register(podStoreInjectable, podsCpuColumnInjectable, podsMemoryColumnInjectable);
    di.override(podStoreInjectable, () => ({
      kubeMetrics: observable.array([{ getName: () => "pod-with-metrics", getNs: () => "default" }]),
      getPodKubeMetrics: () => ({ cpu: 0.0123, memory: 440 * 1024 * 1024 }),
    }) as any);

    const cpu = di.inject(podsCpuColumnInjectable);
    const memory = di.inject(podsMemoryColumnInjectable);

    return render(
      <>
        <div data-testid="cpu">{cpu.content(pod) as React.ReactNode}</div>
        <div data-testid="memory">{memory.content(pod) as React.ReactNode}</div>
      </>,
    );
  };

  it("shows metrics server usage for the pod", () => {
    const result = renderColumns(createPod("pod-with-metrics"));

    expect(result.getByTestId("cpu").textContent).toBe("0.012");
    expect(result.getByTestId("memory").textContent).toBe("440.0MiB");
  });

  it("stays empty instead of showing zero when the pod has no metrics", () => {
    const result = renderColumns(createPod("pod-without-metrics"));

    expect(result.getByTestId("cpu").textContent).toBe("");
    expect(result.getByTestId("memory").textContent).toBe("");
  });

  it("places CPU and Memory right after Namespace", () => {
    const di = createContainer("some-container");

    di.register(podStoreInjectable, podsCpuColumnInjectable, podsMemoryColumnInjectable);
    di.override(podStoreInjectable, () => ({}) as any);

    expect(di.inject(podsCpuColumnInjectable).priority).toBeLessThan(90);
    expect(di.inject(podsMemoryColumnInjectable).priority).toBeLessThan(di.inject(podsCpuColumnInjectable).priority);
    expect(di.inject(podsMemoryColumnInjectable).priority).toBeGreaterThan(80);
  });
});
