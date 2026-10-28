/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import type { Ingress } from "@k8slens/kube-object";
import { isMetricsEmpty } from "../../../common/k8s-api/endpoints/metrics.api";
import type { IngressMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-ingress-metrics.injectable";
import { DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { UsageMetrics } from "../metrics-panel/usage-metrics";
import { getPrometheusSeries, ingressPrometheusSeriesDefinitions } from "../workloads-pods/usage-history/usage-series";
import ingressMetricsInjectable from "./metrics.injectable";

interface Dependencies {
  metrics: IAsyncComputed<IngressMetricData>;
}

/**
 * Only Prometheus knows about ingress traffic, so without it there is nothing to show
 */
const NonInjectedIngressMetricsDetailsComponent = observer(({ metrics }: KubeObjectDetailsProps<Ingress> & Dependencies) => {
  const prometheus = toJS(metrics.value.get());

  if (!prometheus || isMetricsEmpty(prometheus)) {
    return null;
  }

  return (
    <>
      <DrawerTitle>Metrics</DrawerTitle>
      <UsageMetrics
        id="ingress"
        tabs={["Network", "Duration"]}
        fromPrometheus={(tab) => getPrometheusSeries(prometheus, tab, ingressPrometheusSeriesDefinitions)}
        fromMetricsServer={() => []}
      />
    </>
  );
});

export const IngressMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Ingress>>(NonInjectedIngressMetricsDetailsComponent, {
  getProps: (di, props) => ({
    metrics: di.inject(ingressMetricsInjectable, props.object),
    ...props,
  }),
});
