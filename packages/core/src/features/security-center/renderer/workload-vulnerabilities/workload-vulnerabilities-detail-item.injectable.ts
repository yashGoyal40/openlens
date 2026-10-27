/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import type { KubeObject } from "@k8slens/kube-object";
import { shouldShowResourceInjectionToken } from "../../../cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { kubeObjectDetailItemInjectionToken } from "../../../../renderer/components/kube-object-details/kube-object-detail-items/kube-object-detail-item-injection-token";
import currentKubeObjectInDetailsInjectable from "../../../../renderer/components/kube-object-details/current-kube-object-in-details.injectable";
import { vulnerabilityReportsDescriptor } from "../../common/security-center-resources";
import { WorkloadVulnerabilities } from "./workload-vulnerabilities";

const workloadApiVersions: Partial<Record<string, string[]>> = {
  Pod: ["v1"],
  Deployment: ["apps/v1"],
  StatefulSet: ["apps/v1"],
  DaemonSet: ["apps/v1"],
  ReplicaSet: ["apps/v1"],
  Job: ["batch/v1"],
  CronJob: ["batch/v1", "batch/v1beta1"],
};

const isWorkload = (object: KubeObject | undefined) => Boolean(
  object && workloadApiVersions[object.kind]?.includes(object.apiVersion),
);

const workloadVulnerabilitiesDetailItemInjectable = getInjectable({
  id: "security-center-workload-vulnerabilities-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);
    const vulnerabilityReportsAreServed = di.inject(shouldShowResourceInjectionToken, {
      apiName: vulnerabilityReportsDescriptor.apiName,
      group: vulnerabilityReportsDescriptor.group,
    });

    return {
      Component: WorkloadVulnerabilities,
      enabled: computed(() => vulnerabilityReportsAreServed.get() && isWorkload(kubeObject.value.get()?.object)),
      // after the details of the workload itself
      orderNumber: 20,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default workloadVulnerabilitiesDetailItemInjectable;
