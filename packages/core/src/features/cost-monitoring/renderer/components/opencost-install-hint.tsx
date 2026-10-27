/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./cost-monitoring.module.scss";

import React from "react";
import { Button } from "@k8slens/button";
import { openCostNameLabel, openCostServiceName } from "../request-opencost-services.injectable";

export const openCostHelmRepository = "https://opencost.github.io/opencost-helm-chart";

const installCommands = [
  `helm repo add opencost ${openCostHelmRepository}`,
  "helm repo update",
  "helm install opencost opencost/opencost --namespace opencost --create-namespace",
].join("\n");

export interface OpenCostInstallHintProps {
  /**
   * Shows a button to configure the connection, when given
   */
  onConfigure?: () => void;
}

export const OpenCostInstallHint = ({ onConfigure }: OpenCostInstallHintProps) => (
  <div className={styles.panel} data-testid="opencost-install-hint">
    <h6>OpenCost was not found in this cluster</h6>
    <p>
      {"Costs are provided by "}
      <a
        href="https://www.opencost.io"
        target="_blank"
        rel="noreferrer"
      >
        OpenCost
      </a>
      {`, which was looked for as a service labelled ${openCostNameLabel}=${openCostServiceName} or named "${openCostServiceName}". `}
      {"It can be installed from its Helm chart repository:"}
    </p>
    <pre className={styles.commands}>{installCommands}</pre>
    <p className={styles.hint}>
      OpenCost needs Prometheus to collect usage, see the installation guide of OpenCost for the options.
      If OpenCost is installed under another name, configure its namespace, service and port.
    </p>
    {onConfigure && (
      <div className={styles.actions}>
        <Button
          primary
          label="Configure connection"
          onClick={onConfigure}
        />
      </div>
    )}
  </div>
);
