/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-details-tolerations.scss";
import React from "react";
import { DrawerItemExpandable } from "../drawer";
import type  { Toleration, KubeObject } from "@k8slens/kube-object";
import { PodTolerations } from "./pod-tolerations";

export interface KubeObjectWithTolerations extends KubeObject {
  getTolerations(): Toleration[];
}

export interface PodDetailsTolerationsProps {
  workload: KubeObjectWithTolerations;
}

export function PodDetailsTolerations({ workload }: PodDetailsTolerationsProps) {
  const tolerations = workload.getTolerations();

  if (!tolerations.length) return null;

  return (
    <DrawerItemExpandable
      name="Tolerations"
      summary={tolerations.length}
      className="PodDetailsTolerations"
      fullWidth
    >
      <PodTolerations tolerations={tolerations} />
    </DrawerItemExpandable>
  );
}
