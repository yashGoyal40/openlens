/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./cluster-status.module.scss";

import { computed, observable, makeObservable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { ipcRendererOn } from "../../../common/ipc";
import type { Cluster } from "../../../common/cluster/cluster";
import type { IClassName } from "@k8slens/utilities";
import { hasTypedProperty, isObject, isString, cssNames } from "@k8slens/utilities";
import { Button } from "@k8slens/button";
import { Icon } from "@k8slens/icon";
import { Spinner } from "@k8slens/spinner";
import { ClusterGlyph, getEntityColor } from "../cluster-glyph";
import type { KubeAuthUpdate } from "../../../common/cluster-types";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import type { NavigateToEntitySettings } from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import navigateToEntitySettingsInjectable from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import type { RequestClusterActivation } from "../../../features/cluster/activation/common/request-token";
import requestClusterActivationInjectable from "../../../features/cluster/activation/renderer/request-activation.injectable";

export interface ClusterStatusProps {
  className?: IClassName;
  cluster: Cluster;
}

interface Dependencies {
  navigateToEntitySettings: NavigateToEntitySettings;
  entityRegistry: CatalogEntityRegistry;
  requestClusterActivation: RequestClusterActivation;
}

@observer
class NonInjectedClusterStatus extends React.Component<ClusterStatusProps & Dependencies> {
  @observable authOutput: KubeAuthUpdate[] = [];
  @observable isReconnecting = false;

  constructor(props: ClusterStatusProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  get cluster(): Cluster {
    return this.props.cluster;
  }

  @computed get entity() {
    return this.props.entityRegistry.getById(this.cluster.id);
  }

  @computed get hasErrorsOrWarnings(): boolean {
    return this.authOutput.some(({ level }) => level !== "info");
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      ipcRendererOn(`cluster:${this.cluster.id}:connection-update`, (evt, res: unknown) => {
        if (
          isObject(res)
          && hasTypedProperty(res, "message", isString)
          && hasTypedProperty(res, "level", function (val): val is KubeAuthUpdate["level"] { return ["info", "warning", "error"].includes(val as string); })
        ) {
          this.authOutput.push(res);
        } else {
          console.warn(`Got invalid connection update for ${this.cluster.id}`, { update: res });
        }
      }),
    ]);
  }

  componentDidUpdate(prevProps: Readonly<ClusterStatusProps>): void {
    if (prevProps.cluster.id !== this.props.cluster.id) {
      this.isReconnecting = false;
      this.authOutput = [];
    }
  }

  reconnect = async () => {
    this.authOutput = [];
    this.isReconnecting = true;

    try {
      await this.props.requestClusterActivation({
        clusterId: this.cluster.id,
        force: true,
      });
    } catch (error) {
      this.authOutput.push({
        message: String(error),
        level: "error",
      });
    } finally {
      this.isReconnecting = false;
    }
  };

  manageProxySettings = () => {
    this.props.navigateToEntitySettings(this.cluster.id, "proxy");
  };

  @computed get hasFailed(): boolean {
    return !this.isReconnecting && this.authOutput.some(({ level }) => level === "error");
  }

  copyDetails = () => {
    const details = this.authOutput
      .map(({ message, level }) => `[${level}] ${message.trim()}`)
      .join("\n");

    void navigator.clipboard?.writeText(details);
  };

  @computed get problems(): Problem[] {
    return mergeProblems(this.authOutput);
  }

  renderSteps() {
    const infoSteps = this.authOutput.filter(({ level }) => level === "info");
    const steps = infoSteps.length > 0
      ? infoSteps
      : [{ message: "Starting connection", level: "info" as const }];

    return (
      <ol className={styles.steps} data-testid="cluster-status-steps">
        {steps.map(({ message }, index) => {
          const isLast = index === steps.length - 1;
          const state = !isLast
            ? "done"
            : this.hasFailed
              ? "error"
              : "running";

          return (
            <li
              key={index}
              className={styles[state]}
              data-testid={`cluster-status-step-${state}`}>
              {state === "running"
                ? <Spinner singleColor className={styles.stepSpinner} />
                : (
                  <Icon
                    small
                    material={stepIcons[state]}
                    className={styles.stepIcon} />
                )}
              <span>{toStepTitle(message)}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  renderProblems() {
    if (this.problems.length === 0) {
      return null;
    }

    return (
      <div className={styles.details} data-testid="cluster-status-details">
        {this.problems.map(({ level, message, count }, index) => (
          <div key={index} className={cssNames(styles.problem, styles[level])}>
            <Icon
              small
              material={stepIcons[level]}
              className={styles.stepIcon} />
            <pre className={styles.message}>{message}</pre>
            {count > 1 && <span className={styles.count} title={`Reported ${count} times`}>{`×${count}`}</span>}
          </div>
        ))}
      </div>
    );
  }

  renderState() {
    if (this.hasFailed) {
      return (
        <div className={styles.state}>
          <Icon material="error_outline" className={styles.errorIcon} />
          <div>
            <div className={styles.stateTitle}>Unable to connect to the cluster</div>
            <div className={styles.stateHint}>
              Check the kubeconfig credentials, the network and any proxy, then reconnect.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.state}>
        <Spinner singleColor className={styles.spinner} />
        <div>
          <div className={styles.stateTitle}>
            {this.isReconnecting ? "Reconnecting" : "Connecting"}
            &hellip;
          </div>
          <div className={styles.stateHint}>
            Authenticating and checking access to the Kubernetes API
          </div>
        </div>
      </div>
    );
  }

  renderActions() {
    // warnings may be retried by the connection, so they only offer reconnecting
    if (!this.hasErrorsOrWarnings || this.isReconnecting) {
      return null;
    }

    return (
      <div className={styles.actions}>
        <Button
          primary
          label="Reconnect"
          onClick={this.reconnect}
          waiting={this.isReconnecting}
        />
        <Button
          label="Cluster Settings"
          className={styles.secondary}
          onClick={() => this.props.navigateToEntitySettings(this.cluster.id)}
        />
        <a className={styles.link} onClick={this.manageProxySettings}>
          Manage Proxy Settings
        </a>
        <a className={styles.link} onClick={this.copyDetails}>
          Copy Details
        </a>
      </div>
    );
  }

  render() {
    const { entity } = this;
    const name = entity?.getName() ?? this.cluster.name.get();
    const context = this.cluster.contextName.get();

    return (
      <div className={cssNames(styles.status, this.props.className)} data-testid="cluster-status">
        <div className={cssNames(styles.card, { [styles.failed]: this.hasFailed })}>
          <div className={styles.header}>
            {entity && <ClusterGlyph color={getEntityColor(entity)} size={40} />}
            <div className={styles.heading}>
              <h2>{name}</h2>
              {context && context !== name && <div className={styles.context}>{context}</div>}
            </div>
          </div>
          {this.renderState()}
          {this.renderSteps()}
          {this.renderProblems()}
          {this.renderActions()}
        </div>
      </div>
    );
  }
}

export interface Problem {
  level: "warning" | "error";
  message: string;
  count: number;
}

const stepIcons = {
  done: "check_circle",
  warning: "warning",
  error: "cancel",
};

/**
 * "E1028 13:19:48.727846   85154 proxy_server.go:147] Error while ..." -> "Error while ..."
 */
export const withoutLogPrefix = (message: string) => message.trim().replace(/^[IWEF]\d{4} [\d:.]+\s+\d+ [^\]]+\]\s*/, "");

/**
 * "Refreshing connection status ..." -> "Refreshing connection status"
 */
export const toStepTitle = (message: string) => message.trim().replace(/\s*(\.\.\.|…)$/, "");

export const ClusterStatus = withInjectables<Dependencies, ClusterStatusProps>(NonInjectedClusterStatus, {
  getProps: (di, props) => ({
    ...props,
    navigateToEntitySettings: di.inject(navigateToEntitySettingsInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
    requestClusterActivation: di.inject(requestClusterActivationInjectable),
  }),
});

/**
 * Errors and warnings of a connection, with repeats of the same message (eg. from retries) merged
 */
export const mergeProblems = (updates: KubeAuthUpdate[]): Problem[] => {
  const problems = new Map<string, Problem>();

  for (const { message, level } of updates) {
    if (level === "info") {
      continue;
    }

    const text = withoutLogPrefix(message);
    const known = problems.get(`${level}:${text}`);

    if (known) {
      known.count += 1;
    } else {
      problems.set(`${level}:${text}`, { level, message: text, count: 1 });
    }
  }

  return [...problems.values()];
};
