/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./security-overview.module.scss";

import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import type { IComputedValue } from "mobx";
import { comparer, reaction } from "mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { KubeObject } from "@k8slens/kube-object";
import { Icon } from "@k8slens/icon";
import { Spinner } from "@k8slens/spinner";
import type { StrictReactNode } from "@k8slens/utilities";
import { cssNames, noop } from "@k8slens/utilities";
import type { KubeObjectStore } from "../../../../common/k8s-api/kube-object.store";
import type { SubscribeStores } from "../../../../renderer/kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../../../renderer/kube-watch-api/subscribe-stores.injectable";
import { SiblingsInTabLayout } from "../../../../renderer/components/layout/siblings-in-tab-layout";
import { NamespaceSelectFilter } from "../../../../renderer/components/namespaces/namespace-select-filter";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { ConfigAuditReport, ExposedSecretReport, VulnerabilityReport } from "../../common/security-center-resources";
import type { SeverityCounts } from "../../common/severity";
import { severityLevels, severityTitles } from "../../common/severity";
import {
  configAuditReportsRouteInjectable,
  exposedSecretReportsRouteInjectable,
  navigateToConfigAuditReportsInjectable,
  navigateToExposedSecretReportsInjectable,
  navigateToVulnerabilityReportsInjectable,
} from "../../common/security-center-routes.injectable";
import { storeInjectable as vulnerabilityReportStoreInjectable } from "../vulnerability-reports.injectable";
import { storeInjectable as configAuditReportStoreInjectable } from "../config-audit-reports.injectable";
import { storeInjectable as exposedSecretReportStoreInjectable } from "../exposed-secret-reports.injectable";
import { SeverityBadges, severityTones } from "../components/severity-badges";
import { ReportDetailsLink, TargetLink } from "../components/report-target-link";
import { ExternalLink } from "../components/external-link";
import { summarizeAuditReports, summarizeExposedSecretReports, summarizeVulnerabilityReports } from "./security-overview-model";

const topCount = 10;

const installCommands = [
  "helm repo add aqua https://aquasecurity.github.io/helm-charts/",
  "helm repo update",
  "helm install trivy-operator aqua/trivy-operator --namespace trivy-system --create-namespace",
].join("\n");

const trivyOperatorDocs = "https://aquasecurity.github.io/trivy-operator/latest/";

interface Dependencies {
  subscribeStores: SubscribeStores;
  vulnerabilityReportStore: KubeObjectStore<KubeObject>;
  configAuditReportStore: KubeObjectStore<KubeObject>;
  exposedSecretReportStore: KubeObjectStore<KubeObject>;
  configAuditsAreServed: IComputedValue<boolean>;
  exposedSecretsAreServed: IComputedValue<boolean>;
  navigateToVulnerabilityReports: () => void;
  navigateToConfigAuditReports: () => void;
  navigateToExposedSecretReports: () => void;
}

const SeverityCards = ({ counts }: { counts: SeverityCounts }) => (
  <div className={styles.cards}>
    {severityLevels.map(level => (
      <div
        key={level}
        className={cssNames(styles.card, styles[severityTones[level]])}
        data-testid={`security-overview-total-${level}`}
      >
        <div className={styles.count}>{counts[level]}</div>
        <div className={styles.label}>{severityTitles[level]}</div>
      </div>
    ))}
  </div>
);

interface SectionProps {
  title: string;
  testId: string;
  action?: { label: string; onClick: () => void };
  children: StrictReactNode;
}

const Section = ({ title, testId, action, children }: SectionProps) => (
  <section className={styles.section} data-testid={testId}>
    <div className={styles.sectionHeader}>
      <h6>{title}</h6>
      {action && (
        <a className={styles.action} onClick={action.onClick}>
          {action.label}
        </a>
      )}
    </div>
    {children}
  </section>
);

const EmptyState = () => (
  <div className={styles.emptyState} data-testid="security-overview-empty-state">
    <Icon material="verified_user" big />
    <h6>No security reports found in the selected namespaces</h6>
    <p>
      {"Reports are created by the "}
      <ExternalLink href={trivyOperatorDocs}>Trivy Operator</ExternalLink>
      {" which scans the workloads, configuration and RBAC of the cluster. If it is not installed yet, it can be installed with Helm:"}
    </p>
    <pre className={styles.command}>{installCommands}</pre>
    <p>Reports appear here once the first scans have completed, which can take a few minutes.</p>
  </div>
);

const isInstanceOf = <T extends KubeObject>(constructor: new (...args: any[]) => T) => (
  (object: KubeObject): object is T => object instanceof constructor
);

interface OverviewContentProps {
  vulnerabilityReports: VulnerabilityReport[];
  configAuditReports: ConfigAuditReport[] | undefined;
  exposedSecretReports: ExposedSecretReport[] | undefined;
  navigateToVulnerabilityReports: () => void;
  navigateToConfigAuditReports: () => void;
  navigateToExposedSecretReports: () => void;
}

const OverviewContent = ({
  vulnerabilityReports,
  configAuditReports,
  exposedSecretReports,
  navigateToVulnerabilityReports,
  navigateToConfigAuditReports,
  navigateToExposedSecretReports,
}: OverviewContentProps) => {
  if (vulnerabilityReports.length + (configAuditReports?.length ?? 0) + (exposedSecretReports?.length ?? 0) === 0) {
    return <EmptyState />;
  }

  const vulnerabilities = summarizeVulnerabilityReports(vulnerabilityReports);
  const audits = configAuditReports && summarizeAuditReports(configAuditReports);
  const secrets = exposedSecretReports && summarizeExposedSecretReports(exposedSecretReports);

  return (
    <>
      <Section
        title="Vulnerabilities"
        testId="security-overview-vulnerabilities"
        action={{ label: "View all reports", onClick: navigateToVulnerabilityReports }}
      >
        <SeverityCards counts={vulnerabilities.totals} />
        <p className={styles.caption}>
          {`${vulnerabilities.reports} containers scanned in ${vulnerabilities.workloads.length} workloads`}
        </p>
      </Section>

      <div className={styles.columns}>
        <Section title="Most vulnerable workloads" testId="security-overview-top-workloads">
          <ResourceTable
            rows={vulnerabilities.workloads.slice(0, topCount)}
            columns={[
              {
                title: "Workload",
                value: workload => (
                  workload.target
                    ? <TargetLink target={workload.target} parent={workload.report} />
                    : <ReportDetailsLink report={workload.report} />
                ),
              },
              { title: "Namespace", value: workload => workload.namespace },
              { title: "Vulnerabilities", value: workload => <SeverityBadges compact counts={workload.counts} /> },
            ]}
          />
        </Section>

        <Section title="Most vulnerable images" testId="security-overview-top-images">
          <ResourceTable
            rows={vulnerabilities.images.slice(0, topCount)}
            columns={[
              {
                title: "Image",
                className: styles.image,
                value: image => <ReportDetailsLink report={image.report}>{image.report.getImage() || image.image}</ReportDetailsLink>,
              },
              { title: "Workloads", className: styles.narrow, value: image => image.workloads },
              { title: "Vulnerabilities", value: image => <SeverityBadges compact counts={image.counts} /> },
            ]}
          />
        </Section>
      </div>

      <div className={styles.columns}>
        <Section title="Most affected namespaces" testId="security-overview-namespaces">
          <ResourceTable
            rows={vulnerabilities.namespaces.slice(0, topCount)}
            columns={[
              { title: "Namespace", value: namespace => namespace.namespace },
              { title: "Images", className: styles.narrow, value: namespace => namespace.reports },
              { title: "Vulnerabilities", value: namespace => <SeverityBadges compact counts={namespace.counts} /> },
            ]}
          />
        </Section>

        <div className={styles.stack}>
          {audits && (
            <Section
              title="Config audits"
              testId="security-overview-config-audits"
              action={{ label: "View audits", onClick: navigateToConfigAuditReports }}
            >
              <SeverityBadges
                counts={audits.failedChecks}
                emptyLabel="No failed checks"
                noun="failed checks" />
              <p className={styles.caption}>
                {`${audits.failingResources} of ${audits.resources} audited resources have failed checks`}
              </p>
            </Section>
          )}

          {secrets && (
            <Section
              title="Exposed secrets"
              testId="security-overview-exposed-secrets"
              action={{ label: "View secrets", onClick: navigateToExposedSecretReports }}
            >
              <div className={styles.secretsCount}>{secrets.secrets}</div>
              <SeverityBadges
                counts={secrets.counts}
                emptyLabel="No exposed secrets"
                noun="secrets" />
              <p className={styles.caption}>
                {`found in ${secrets.affectedImages} of ${exposedSecretReports?.length ?? 0} scanned images`}
              </p>
            </Section>
          )}
        </div>
      </div>
    </>
  );
};

@observer
class NonInjectedSecurityOverview extends React.Component<Dependencies> {
  componentDidMount() {
    let unsubscribe = noop;

    disposeOnUnmount(this, [
      reaction(
        () => this.getServedStores(),
        (stores) => {
          unsubscribe();
          unsubscribe = this.props.subscribeStores(stores, {
            // a disabled scanner must not break the whole overview
            onLoadFailure: noop,
          });
        },
        {
          fireImmediately: true,
          equals: comparer.shallow,
        },
      ),
      () => unsubscribe(),
    ]);
  }

  private getServedStores() {
    const { vulnerabilityReportStore, configAuditReportStore, exposedSecretReportStore, configAuditsAreServed, exposedSecretsAreServed } = this.props;

    return [
      vulnerabilityReportStore,
      ...(configAuditsAreServed.get() ? [configAuditReportStore] : []),
      ...(exposedSecretsAreServed.get() ? [exposedSecretReportStore] : []),
    ];
  }

  renderContent() {
    const { vulnerabilityReportStore, configAuditReportStore, exposedSecretReportStore, configAuditsAreServed, exposedSecretsAreServed } = this.props;

    if (!vulnerabilityReportStore.isLoaded) {
      return <Spinner center />;
    }

    return (
      <OverviewContent
        vulnerabilityReports={vulnerabilityReportStore.contextItems.filter(isInstanceOf(VulnerabilityReport))}
        configAuditReports={configAuditsAreServed.get()
          ? configAuditReportStore.contextItems.filter(isInstanceOf(ConfigAuditReport))
          : undefined}
        exposedSecretReports={exposedSecretsAreServed.get()
          ? exposedSecretReportStore.contextItems.filter(isInstanceOf(ExposedSecretReport))
          : undefined}
        navigateToVulnerabilityReports={this.props.navigateToVulnerabilityReports}
        navigateToConfigAuditReports={this.props.navigateToConfigAuditReports}
        navigateToExposedSecretReports={this.props.navigateToExposedSecretReports}
      />
    );
  }

  render() {
    return (
      <SiblingsInTabLayout scrollable>
        <div className={styles.overview} data-testid="security-overview">
          <div className={styles.header}>
            <h5>Security Overview</h5>
            <NamespaceSelectFilter id="security-overview-namespace-select-filter-input" />
          </div>
          {this.renderContent()}
        </div>
      </SiblingsInTabLayout>
    );
  }
}

export const SecurityOverview = withInjectables<Dependencies>(NonInjectedSecurityOverview, {
  getProps: (di) => ({
    subscribeStores: di.inject(subscribeStoresInjectable),
    vulnerabilityReportStore: di.inject(vulnerabilityReportStoreInjectable),
    configAuditReportStore: di.inject(configAuditReportStoreInjectable),
    exposedSecretReportStore: di.inject(exposedSecretReportStoreInjectable),
    configAuditsAreServed: di.inject(configAuditReportsRouteInjectable).isEnabled,
    exposedSecretsAreServed: di.inject(exposedSecretReportsRouteInjectable).isEnabled,
    navigateToVulnerabilityReports: di.inject(navigateToVulnerabilityReportsInjectable),
    navigateToConfigAuditReports: di.inject(navigateToConfigAuditReportsInjectable),
    navigateToExposedSecretReports: di.inject(navigateToExposedSecretReportsInjectable),
  }),
});
