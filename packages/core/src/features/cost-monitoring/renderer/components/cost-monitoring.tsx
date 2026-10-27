/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./cost-monitoring.module.scss";

import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import { action, computed, makeObservable, observable } from "mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import { Icon } from "@k8slens/icon";
import { Spinner } from "@k8slens/spinner";
import { Button } from "@k8slens/button";
import { TabLayout } from "../../../../renderer/components/layout/tab-layout-2";
import { Radio, RadioGroup } from "../../../../renderer/components/radio";
import { Input } from "../../../../renderer/components/input";
import { NoItems } from "../../../../renderer/components/no-items";
import { NamespaceSelectFilter } from "../../../../renderer/components/namespaces/namespace-select-filter";
import type { ClusterContext } from "../../../../renderer/cluster-frame-context/cluster-frame-context";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../../renderer/cluster-frame-context/for-namespaced-resources.injectable";
import type { StorageLayer } from "../../../../renderer/utils/storage-helper";
import type { CostAllocationModel } from "../cost-allocation-model";
import type { CostMonitoringSettings } from "../cost-monitoring-settings.injectable";
import costMonitoringSettingsInjectable from "../cost-monitoring-settings.injectable";
import type { CreateCostAllocationModel } from "../create-cost-allocation-model.injectable";
import createCostAllocationModelInjectable from "../create-cost-allocation-model.injectable";
import type { OpenCostDiscovery } from "../opencost-discovery.injectable";
import openCostDiscoveryInjectable from "../opencost-discovery.injectable";
import type { CostAggregation, CostAllocationRow, CostWindow, OpenCostAllocationQuery } from "../opencost-allocation";
import { costAggregations, costWindows, formatOpenCostServiceRef, isSpecialAllocationName } from "../opencost-allocation";
import { createCostFormatter } from "../format-cost";
import { CostAllocationTable } from "./cost-allocation-table";
import { OpenCostSettingsForm } from "./opencost-settings-form";
import { OpenCostInstallHint } from "./opencost-install-hint";

interface Dependencies {
  createCostAllocationModel: CreateCostAllocationModel;
  discovery: OpenCostDiscovery;
  settingsStorage: StorageLayer<CostMonitoringSettings>;
  clusterContext: ClusterContext;
}

export const getAllocationQuery = ({ window, aggregation, labelKey }: CostMonitoringSettings): OpenCostAllocationQuery | undefined => {
  if (aggregation !== "label") {
    return { window, aggregate: aggregation };
  }

  const key = labelKey.trim();

  return key
    ? { window, aggregate: `label:${key}` }
    : undefined;
};

@observer
class NonInjectedCostMonitoring extends React.Component<Dependencies> {
  private readonly model: CostAllocationModel;

  @observable showSettings = false;

  /**
   * Applied on enter or blur, to not query OpenCost for every typed character
   */
  @observable labelKeyDraft: string;

  constructor(props: Dependencies) {
    super(props);

    this.model = props.createCostAllocationModel(() => getAllocationQuery(this.model.settings.get()));
    this.labelKeyDraft = this.model.settings.get().labelKey;

    makeObservable(this);
  }

  componentDidMount() {
    this.props.discovery.discoverUnlessFound();

    disposeOnUnmount(this, [
      this.model.start(),
    ]);
  }

  @computed get settings() {
    return this.model.settings.get();
  }

  @computed get formatCost() {
    return createCostFormatter(this.settings.currency);
  }

  @computed get isFilteredByNamespace() {
    return this.settings.aggregation === "namespace" && !this.props.clusterContext.hasSelectedAll;
  }

  @computed get allRows(): CostAllocationRow[] {
    const state = this.model.state.get();

    return state.status === "loaded" ? state.rows : [];
  }

  /**
   * Costs per namespace follow the global namespace selection, other aggregates are cluster wide
   */
  @computed get visibleRows() {
    if (!this.isFilteredByNamespace) {
      return this.allRows;
    }

    const selected = new Set(this.props.clusterContext.contextNamespaces);

    return this.allRows.filter(row => !isSpecialAllocationName(row.name) && selected.has(row.name));
  }

  setWindow = (window: CostWindow) => this.props.settingsStorage.merge({ window });

  setAggregation = (aggregation: CostAggregation) => this.props.settingsStorage.merge({ aggregation });

  applyLabelKey = () => this.props.settingsStorage.merge({ labelKey: this.labelKeyDraft.trim() });

  setLabelKeyDraft = action((value: string) => this.labelKeyDraft = value);

  toggleSettings = action(() => this.showSettings = !this.showSettings);

  closeSettings = action(() => this.showSettings = false);

  refresh = () => {
    if (this.model.service.get()) {
      this.model.reload();
    } else {
      this.props.discovery.rediscover();
    }
  };

  renderSource() {
    const service = this.model.service.get();

    if (!service) {
      return null;
    }

    return (
      <span className={styles.source} data-testid="cost-monitoring-source">
        {`OpenCost at ${formatOpenCostServiceRef(service)}`}
        {this.model.isServiceOverridden.get() && " (configured)"}
      </span>
    );
  }

  renderHeader() {
    return (
      <div className={styles.header}>
        <div className={styles.title}>
          <h5>Cost</h5>
          {this.renderSource()}
        </div>
        {this.settings.aggregation === "namespace" && (
          <div className={styles.namespaceFilter}>
            <NamespaceSelectFilter id="cost-monitoring-namespace-select-filter-input" />
          </div>
        )}
        <Icon
          material="refresh"
          interactive
          tooltip="Refresh"
          onClick={this.refresh}
          data-testid="cost-monitoring-refresh"
        />
        <Icon
          material="settings"
          interactive
          active={this.showSettings}
          tooltip="OpenCost connection"
          onClick={this.toggleSettings}
          data-testid="cost-monitoring-toggle-settings"
        />
      </div>
    );
  }

  renderControls() {
    const { window, aggregation } = this.settings;

    return (
      <div className={styles.controls}>
        <div className={styles.control}>
          <span className={styles.controlLabel}>Window</span>
          <RadioGroup
            asButtons
            value={window}
            onChange={this.setWindow}
          >
            {costWindows.map(option => (
              <Radio
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </div>
        <div className={styles.control}>
          <span className={styles.controlLabel}>Aggregate by</span>
          <RadioGroup
            asButtons
            value={aggregation}
            onChange={this.setAggregation}
          >
            {costAggregations.map(option => (
              <Radio
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </div>
        {aggregation === "label" && (
          <Input
            className={styles.labelKey}
            theme="round-black"
            placeholder="Label key, e.g. app"
            value={this.labelKeyDraft}
            onChange={this.setLabelKeyDraft}
            onSubmit={this.applyLabelKey}
            onBlur={this.applyLabelKey}
            data-testid="cost-monitoring-label-key"
          />
        )}
      </div>
    );
  }

  renderLoading(message: string) {
    return (
      <div className={styles.loading} data-testid="cost-monitoring-loading">
        <Spinner />
        <span>{message}</span>
      </div>
    );
  }

  renderError(title: string, error: string) {
    return (
      <div className={styles.panel} data-testid="cost-monitoring-error">
        <h6>{title}</h6>
        <p className={styles.error}>{error}</p>
        <p className={styles.hint}>
          Check that OpenCost is running and that its namespace, service and port are correct.
        </p>
        <div className={styles.actions}>
          <Button
            primary
            label="Retry"
            onClick={this.refresh}
          />
          {!this.showSettings && (
            <Button
              plain
              label="Configure connection"
              onClick={this.toggleSettings}
            />
          )}
        </div>
      </div>
    );
  }

  renderSummary() {
    const shown = this.visibleRows.length;
    const total = this.allRows.length;

    if (!this.isFilteredByNamespace || shown === total) {
      return null;
    }

    return (
      <p className={styles.summaryLine} data-testid="cost-monitoring-filter-summary">
        {`Showing ${shown} of ${total} namespaces, following the namespace selection.`}
      </p>
    );
  }

  renderContent() {
    const discovery = this.props.discovery.state.get();

    if (!this.model.service.get()) {
      switch (discovery.status) {
        case "idle":
        case "discovering":
          return this.renderLoading("Looking for OpenCost...");
        case "failed":
          return this.renderError("Could not look for OpenCost", discovery.error);
        default:
          return <OpenCostInstallHint onConfigure={this.showSettings ? undefined : this.toggleSettings} />;
      }
    }

    if (!getAllocationQuery(this.settings)) {
      return <NoItems>Enter a label key to aggregate costs by.</NoItems>;
    }

    const state = this.model.state.get();

    switch (state.status) {
      case "idle":
      case "loading":
        return this.renderLoading("Loading costs...");
      case "failed":
        return this.renderError("Could not load costs from OpenCost", state.error);
      case "loaded":
        if (this.visibleRows.length === 0) {
          return (
            <NoItems>
              {this.allRows.length === 0
                ? "OpenCost has no cost data for this window yet."
                : "No costs for the selected namespaces."}
            </NoItems>
          );
        }

        return (
          <>
            {state.warning && <p className={styles.hint}>{state.warning}</p>}
            {this.renderSummary()}
            <CostAllocationTable rows={this.visibleRows} formatCost={this.formatCost} />
          </>
        );
    }
  }

  render() {
    return (
      <TabLayout scrollable>
        <div className={styles.costMonitoring} data-testid="cost-monitoring-page">
          {this.renderHeader()}
          {this.renderControls()}
          {this.showSettings && (
            <OpenCostSettingsForm
              settings={this.settings}
              settingsStorage={this.props.settingsStorage}
              discovered={this.props.discovery.service.get()}
              onClose={this.closeSettings}
            />
          )}
          {this.renderContent()}
        </div>
      </TabLayout>
    );
  }
}

export const CostMonitoring = withInjectables<Dependencies>(NonInjectedCostMonitoring, {
  getProps: (di, props) => ({
    ...props,
    createCostAllocationModel: di.inject(createCostAllocationModelInjectable),
    discovery: di.inject(openCostDiscoveryInjectable),
    settingsStorage: di.inject(costMonitoringSettingsInjectable),
    clusterContext: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
  }),
});
