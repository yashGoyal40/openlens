/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./cost-monitoring.module.scss";

import React, { useState } from "react";
import { Button } from "@k8slens/button";
import { Input } from "../../../../renderer/components/input";
import type { StorageLayer } from "../../../../renderer/utils/storage-helper";
import type { CostMonitoringSettings } from "../cost-monitoring-settings.injectable";
import { defaultCostMonitoringSettings } from "../cost-monitoring-settings.injectable";
import type { OpenCostServiceRef } from "../opencost-allocation";
import { openCostDefaultPort, openCostServiceName } from "../request-opencost-services.injectable";
import { isValidCurrency } from "../format-cost";

type FormField = "serviceNamespace" | "serviceName" | "servicePort" | "currency";

const fields: { id: FormField; title: string; placeholder: (discovered?: OpenCostServiceRef) => string }[] = [
  { id: "serviceNamespace", title: "Namespace", placeholder: discovered => discovered?.namespace ?? openCostServiceName },
  { id: "serviceName", title: "Service", placeholder: discovered => discovered?.name ?? openCostServiceName },
  { id: "servicePort", title: "Port", placeholder: discovered => discovered?.port ?? openCostDefaultPort },
  { id: "currency", title: "Currency", placeholder: () => defaultCostMonitoringSettings.currency },
];

export interface OpenCostSettingsFormProps {
  settings: CostMonitoringSettings;
  settingsStorage: StorageLayer<CostMonitoringSettings>;

  /**
   * Shown as placeholders, the discovered values are used for empty fields
   */
  discovered: OpenCostServiceRef | undefined;
  onClose: () => void;
}

export function OpenCostSettingsForm({ settings, settingsStorage, discovered, onClose }: OpenCostSettingsFormProps) {
  const [draft, setDraft] = useState<Record<FormField, string>>({
    serviceNamespace: settings.serviceNamespace,
    serviceName: settings.serviceName,
    servicePort: settings.servicePort,
    currency: settings.currency,
  });
  const currencyIsValid = !draft.currency.trim() || isValidCurrency(draft.currency);
  const portIsValid = /^[a-z0-9-]*$/i.test(draft.servicePort.trim());
  const canSave = currencyIsValid && portIsValid;

  const save = () => {
    if (!canSave) {
      return;
    }

    settingsStorage.merge({
      serviceNamespace: draft.serviceNamespace.trim(),
      serviceName: draft.serviceName.trim(),
      servicePort: draft.servicePort.trim(),
      currency: draft.currency.trim().toUpperCase() || defaultCostMonitoringSettings.currency,
    });
    onClose();
  };

  const useDiscovered = () => {
    settingsStorage.merge({
      serviceNamespace: "",
      serviceName: "",
      servicePort: "",
    });
    onClose();
  };

  return (
    <div className={styles.panel} data-testid="opencost-settings-form">
      <h6>OpenCost connection</h6>
      <p className={styles.hint}>
        OpenCost is queried through the service proxy of the Kubernetes API. Leave fields empty to use the discovered service.
      </p>
      <div className={styles.settingsFields}>
        {fields.map(field => (
          <div key={field.id} className={styles.field}>
            <span>{field.title}</span>
            <Input
              theme="round-black"
              value={draft[field.id]}
              placeholder={field.placeholder(discovered)}
              onChange={value => setDraft(previous => ({ ...previous, [field.id]: value }))}
              onSubmit={save}
              data-testid={`opencost-settings-${field.id}`}
            />
          </div>
        ))}
      </div>
      {!currencyIsValid && <p className={styles.error}>Currency must be an ISO 4217 code, like USD or EUR.</p>}
      {!portIsValid && <p className={styles.error}>Port must be a port number or name.</p>}
      <div className={styles.actions}>
        <Button
          primary
          label="Save"
          disabled={!canSave}
          onClick={save}
          data-testid="opencost-settings-save"
        />
        <Button
          plain
          label="Use discovered service"
          onClick={useDiscovered}
        />
        <Button
          plain
          label="Cancel"
          onClick={onClose}
        />
      </div>
    </div>
  );
}
