/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import apiKubeGetInjectable from "../../k8s/api-kube-get.injectable";
import requestNodeUsageInjectable from "./request-node-usage.injectable";

describe("request node usage", () => {
  it("reads cpu cores and memory bytes from metrics-server by node name", async () => {
    const di = getDiForUnitTesting();
    const apiKubeGet = jest.fn().mockResolvedValue({
      items: [
        { metadata: { name: "node-1" }, usage: { cpu: "250m", memory: "1Gi" }},
        { metadata: { name: "node-2" }, usage: { cpu: "2", memory: "512Mi" }},
        { metadata: {}, usage: { cpu: "1", memory: "1Gi" }},
      ],
    });

    di.override(apiKubeGetInjectable, () => apiKubeGet);

    const usage = await di.inject(requestNodeUsageInjectable)();

    expect(apiKubeGet).toHaveBeenCalledWith("/apis/metrics.k8s.io/v1beta1/nodes");
    expect([...usage.entries()]).toEqual([
      ["node-1", { cpu: 0.25, memory: 1024 ** 3 }],
      ["node-2", { cpu: 2, memory: 512 * 1024 ** 2 }],
    ]);
  });
});
