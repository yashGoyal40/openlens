/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeJsonApi, PodApi } from "@k8slens/kube-api";
import { JsonApiErrorParsed } from "@k8slens/json-api";

describe("PodApi", () => {
  let podApi: PodApi;
  let kubeJsonApi: jest.Mocked<KubeJsonApi>;

  beforeEach(() => {
    kubeJsonApi = {
      getResponse: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
    } as never;

    podApi = new PodApi({
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      } as any,
      maybeKubeApi: kubeJsonApi,
    });
  });

  describe("evict", () => {
    it("explains a successful eviction", async () => {
      kubeJsonApi.post.mockResolvedValue({
        kind: "Status",
        apiVersion: "v1",
        status: "Success",
        code: 201,
        message: "",
      } as never);

      await expect(podApi.evict({ name: "some-pod", namespace: "default" })).resolves.toBeDefined();
      expect(kubeJsonApi.post).toHaveBeenCalledWith(
        "/api/v1/namespaces/default/pods/some-pod/eviction",
        expect.anything(),
      );
    });

    it("throws a refused eviction, such as one without permission", async () => {
      const refused = new JsonApiErrorParsed({ message: "forbidden" }, ["forbidden"]);

      kubeJsonApi.post.mockRejectedValue(refused);

      await expect(podApi.evict({ name: "some-pod", namespace: "default" })).rejects.toBe(refused);
    });

    it("throws the explanation of a failed status", async () => {
      kubeJsonApi.post.mockRejectedValue({
        kind: "Status",
        apiVersion: "v1",
        status: "Failure",
        code: 429,
        message: "Cannot evict pod as it would violate the pod's disruption budget.",
      });

      await expect(podApi.evict({ name: "some-pod", namespace: "default" })).rejects.toEqual(
        expect.stringContaining("disruption budget"),
      );
    });
  });
});
