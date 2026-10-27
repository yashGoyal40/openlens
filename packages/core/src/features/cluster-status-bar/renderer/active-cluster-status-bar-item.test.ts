/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { KubernetesCluster } from "../../../common/catalog-entities";
import { formatActiveCluster } from "./active-cluster-status-bar-item.injectable";

const createCluster = (kubeVersion?: string) => new KubernetesCluster({
  metadata: {
    uid: "some-cluster-id",
    name: "some-cluster",
    labels: {},
    kubeVersion,
  },
  spec: {
    kubeconfigPath: "/some/kubeconfig",
    kubeconfigContext: "some-context",
  },
  status: {
    phase: "connected",
  },
});

describe("active cluster status bar item", () => {
  it("shows the cluster name and its Kubernetes version", () => {
    expect(formatActiveCluster(createCluster("v1.36.4-eks-abc1234"))).toBe("some-cluster (v1.36.4-eks-abc1234)");
  });

  it("shows only the name while the version is not known yet", () => {
    expect(formatActiveCluster(createCluster("unknown"))).toBe("some-cluster");
    expect(formatActiveCluster(createCluster())).toBe("some-cluster");
  });
});
