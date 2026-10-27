/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./cost-monitoring.module.scss";

import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { KubeObject } from "@k8slens/kube-object";
import { Spinner } from "@k8slens/spinner";
import { DrawerItem } from "../../../../renderer/components/drawer";
import type { KubeObjectDetailsProps } from "../../../../renderer/components/kube-object-details";
import type { CostAllocationModel } from "../cost-allocation-model";
import type { CreateCostAllocationModel } from "../create-cost-allocation-model.injectable";
import createCostAllocationModelInjectable from "../create-cost-allocation-model.injectable";
import type { OpenCostDiscovery } from "../opencost-discovery.injectable";
import openCostDiscoveryInjectable from "../opencost-discovery.injectable";
import type { CostAllocationRow } from "../opencost-allocation";
import type { FormatCost } from "../format-cost";
import { createCostFormatter, formatEfficiency } from "../format-cost";

interface Dependencies {
  createCostAllocationModel: CreateCostAllocationModel;
  discovery: OpenCostDiscovery;
}

const renderBreakdown = (row: CostAllocationRow, formatCost: FormatCost) => {
  const parts: [string, number][] = [
    ["CPU", row.cpuCost],
    ["GPU", row.gpuCost],
    ["RAM", row.ramCost],
    ["PV", row.pvCost],
    ["Network", row.networkCost],
    ["Load balancer", row.loadBalancerCost],
    ["Shared", row.sharedCost],
  ];

  return parts
    .filter(([, cost]) => cost > 0)
    .map(([title, cost]) => `${title} ${formatCost(cost)}`)
    .join(" · ");
};

/**
 * The cost of the namespace over the last 7 days, shown only when OpenCost is available
 */
@observer
class NonInjectedNamespaceCostSummary extends React.Component<KubeObjectDetailsProps<KubeObject> & Dependencies> {
  private readonly model: CostAllocationModel;

  constructor(props: KubeObjectDetailsProps<KubeObject> & Dependencies) {
    super(props);

    this.model = props.createCostAllocationModel(() => ({ window: "7d", aggregate: "namespace" }));
  }

  componentDidMount() {
    this.props.discovery.discoverOnce();

    disposeOnUnmount(this, [
      this.model.start(),
    ]);
  }

  renderValue() {
    const state = this.model.state.get();

    switch (state.status) {
      case "idle":
      case "loading":
        return <Spinner />;
      case "failed":
        return <span className={styles.error} title={state.error}>Unavailable</span>;

      case "loaded": {
        const formatCost = createCostFormatter(this.model.settings.get().currency);
        const row = state.rows.find(row => row.name === this.props.object.getName());

        if (!row) {
          return <span className={styles.hint}>No cost data</span>;
        }

        const breakdown = renderBreakdown(row, formatCost);

        return (
          <span className={styles.namespaceCost}>
            <span data-testid="namespace-cost-total">{formatCost(row.totalCost)}</span>
            {breakdown && <span className={styles.hint}>{breakdown}</span>}
            <span className={styles.hint}>
              {`CPU efficiency ${formatEfficiency(row.cpuEfficiency)} · RAM efficiency ${formatEfficiency(row.ramEfficiency)}`}
            </span>
          </span>
        );
      }
    }
  }

  render() {
    if (!this.model.service.get()) {
      return null;
    }

    return (
      <DrawerItem name="Cost (7 days)" data-testid="namespace-cost-summary">
        {this.renderValue()}
      </DrawerItem>
    );
  }
}

export const NamespaceCostSummary = withInjectables<Dependencies, KubeObjectDetailsProps<KubeObject>>(NonInjectedNamespaceCostSummary, {
  getProps: (di, props) => ({
    ...props,
    createCostAllocationModel: di.inject(createCostAllocationModelInjectable),
    discovery: di.inject(openCostDiscoveryInjectable),
  }),
});
