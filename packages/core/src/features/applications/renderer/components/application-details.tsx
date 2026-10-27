/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import "./application-details.scss";

import React from "react";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import { Spinner } from "@k8slens/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { Ingress, KubeObject, Service } from "@k8slens/kube-object";
import { Drawer, DrawerItem } from "../../../../renderer/components/drawer";
import { KubeObjectAge } from "../../../../renderer/components/kube-object/age";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import type { ResourceTableColumn } from "../../../resource-views/renderer/components/resource-table";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import type { Application, ApplicationReference, ApplicationWorkload } from "../applications";
import { findApplication } from "../applications";
import { getApplicationServices, getIngressesRoutingTo, getIngressServiceNames } from "../application-networking";
import type { ApplicationsData } from "../applications-data.injectable";
import applicationsDataInjectable from "../applications-data.injectable";
import selectedApplicationInjectable from "../selected-application.injectable";
import type { ShowApplicationDetails } from "../show-application-details.injectable";
import showApplicationDetailsInjectable from "../show-application-details.injectable";
import { HealthBadge } from "./health-badge";

const LinkToObject = ({ object }: { object: KubeObject }) => (
  <ObjectReferenceLink
    parent={object}
    reference={{
      kind: object.kind,
      apiVersion: object.apiVersion,
      name: object.getName(),
      namespace: object.getNs(),
    }}
  />
);

const workloadColumns: ResourceTableColumn<ApplicationWorkload>[] = [
  { title: "Kind", value: ({ object }) => object.kind },
  { title: "Name", value: ({ object }) => <LinkToObject object={object} /> },
  { title: "State", value: ({ status }) => status.description },
  { title: "Status", value: ({ status }) => <HealthBadge health={status.health} /> },
];

const serviceColumns: ResourceTableColumn<Service>[] = [
  { title: "Name", value: service => <LinkToObject object={service} /> },
  { title: "Type", value: service => service.getType() },
  { title: "Cluster IP", value: service => service.getClusterIp() },
  { title: "Ports", value: service => service.getPorts().map(port => port.toString()).join(", ") },
];

const getIngressColumns = (services: Service[]): ResourceTableColumn<Ingress>[] => [
  { title: "Name", value: ingress => <LinkToObject object={ingress} /> },
  { title: "Hosts", value: ingress => ingress.getHosts().join(", ") || "*" },
  {
    title: "Services",
    value: ingress => {
      const serviceNames = getIngressServiceNames(ingress);

      return services
        .filter(service => serviceNames.has(service.getName()))
        .map(service => service.getName())
        .join(", ");
    },
  },
  { title: "Load Balancers", value: ingress => ingress.getLoadBalancers().join(", ") },
];

export interface ApplicationDetailsProps {
  application: Application;
}

interface Dependencies {
  applicationsData: ApplicationsData;
}

const NonInjectedApplicationDetails = observer(({ application, applicationsData }: ApplicationDetailsProps & Dependencies) => {
  const services = getApplicationServices(application, applicationsData.services.get());
  const ingresses = getIngressesRoutingTo(services, applicationsData.ingresses.get());
  const { status } = application;

  return (
    <div className="ApplicationDetails">
      <DrawerItem name="Namespace">
        {application.namespace}
      </DrawerItem>
      <DrawerItem name="Status">
        <HealthBadge health={status.health} />
        {status.description && <span className="status-description">{status.description}</span>}
      </DrawerItem>
      <DrawerItem name="Version" hidden={application.versions.length === 0}>
        {application.versions.join(", ")}
      </DrawerItem>
      <DrawerItem name="Managed by" hidden={application.managers.length === 0}>
        {application.managers.join(", ")}
      </DrawerItem>
      <DrawerItem name="Grouped by">
        {application.identitySources.join(", ")}
      </DrawerItem>
      <DrawerItem name="Age">
        <KubeObjectAge object={application.oldestWorkload} compact={false} />
      </DrawerItem>
      <ResourceTable
        title="Workloads"
        rows={application.workloads}
        columns={workloadColumns}
      />
      <ResourceTable
        title="Services"
        rows={services}
        columns={serviceColumns}
      />
      <ResourceTable
        title="Ingresses"
        rows={ingresses}
        columns={getIngressColumns(services)}
      />
    </div>
  );
});

export const ApplicationDetails = withInjectables<Dependencies, ApplicationDetailsProps>(NonInjectedApplicationDetails, {
  getProps: (di, props) => ({
    ...props,
    applicationsData: di.inject(applicationsDataInjectable),
  }),
});

interface DrawerDependencies {
  selectedApplication: IComputedValue<ApplicationReference | undefined>;
  applicationsData: ApplicationsData;
  showApplicationDetails: ShowApplicationDetails;
}

const NonInjectedApplicationDetailsDrawer = observer(({ selectedApplication, applicationsData, showApplicationDetails }: DrawerDependencies) => {
  const selected = selectedApplication.get();

  if (!selected) {
    return null;
  }

  const renderContent = () => {
    const application = findApplication(applicationsData.applications.get(), selected);

    if (application) {
      return <ApplicationDetails application={application} />;
    }

    if (!applicationsData.isLoaded.get()) {
      return <Spinner center />;
    }

    return (
      <p className="not-found">
        {`No workloads of application "${selected.name}" were found in namespace "${selected.namespace}".`}
      </p>
    );
  };

  return (
    <Drawer
      className="ApplicationDetailsDrawer"
      open={true}
      title={`Application: ${selected.name}`}
      onClose={() => {
        // Clicking outside of the drawer may have navigated away already
        if (selectedApplication.get()) {
          showApplicationDetails(undefined);
        }
      }}
      testIdForClose="close-application-details"
      data-testid={`application-details-for-${selected.namespace}/${selected.name}`}
    >
      {renderContent()}
    </Drawer>
  );
});

export const ApplicationDetailsDrawer = withInjectables<DrawerDependencies>(NonInjectedApplicationDetailsDrawer, {
  getProps: (di, props) => ({
    ...props,
    selectedApplication: di.inject(selectedApplicationInjectable),
    applicationsData: di.inject(applicationsDataInjectable),
    showApplicationDetails: di.inject(showApplicationDetailsInjectable),
  }),
});
