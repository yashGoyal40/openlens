/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { Node } from "@k8slens/kube-object";

/**
 * Labels that provisioners and managed Kubernetes services put on nodes to name the pool
 * the node belongs to, most specific first
 */
export const nodePoolLabels = [
  "karpenter.sh/nodepool",
  "karpenter.sh/provisioner-name",
  "eks.amazonaws.com/nodegroup",
  "alpha.eksctl.io/nodegroup-name",
  "cloud.google.com/gke-nodepool",
  "kubernetes.azure.com/agentpool",
  "agentpool",
  "doks.digitalocean.com/node-pool",
  "kops.k8s.io/instancegroup",
];

export const getNodePool = (node: Node): string | undefined => {
  const labels = node.metadata.labels ?? {};

  return nodePoolLabels
    .map(label => labels[label])
    .find(Boolean);
};

/**
 * Infrastructure tools often create node groups from a name prefix, which appends a long
 * unique id (eg. "system-0f1e2d3c4b5a69788796a5b4c3"). Tables show the name without it.
 */
export const getNodePoolDisplayName = (pool: string) => pool.replace(/-(?:[0-9a-f]{20,}|[0-9]{14,})$/i, "");
