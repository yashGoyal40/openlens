/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import "./applications.scss";

import React from "react";
import type { IComputedValue } from "mobx";
import { comparer, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import { Icon } from "@k8slens/icon";
import { TooltipPosition } from "@k8slens/tooltip";
import type { Disposer } from "@k8slens/utilities";
import { noop } from "@k8slens/utilities";
import type { ItemListStore } from "../../../../renderer/components/item-object-list/list-layout";
import { ItemListLayout } from "../../../../renderer/components/item-object-list/list-layout";
import { SiblingsInTabLayout } from "../../../../renderer/components/layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../../../../renderer/components/namespaces/namespace-select-badge";
import { NamespaceSelectFilter } from "../../../../renderer/components/namespaces/namespace-select-filter";
import { KubeObjectAge } from "../../../../renderer/components/kube-object/age";
import type { ClusterContext } from "../../../../renderer/cluster-frame-context/cluster-frame-context";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../../renderer/cluster-frame-context/for-namespaced-resources.injectable";
import type { SubscribeStores } from "../../../../renderer/kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../../../renderer/kube-watch-api/subscribe-stores.injectable";
import type { PageParam } from "../../../../renderer/navigation/page-param";
import kubeDetailsUrlParamInjectable from "../../../../renderer/components/kube-detail-params/kube-details-url.injectable";
import type { Application, ApplicationReference } from "../applications";
import { findApplication } from "../applications";
import type { ApplicationsData } from "../applications-data.injectable";
import applicationsDataInjectable from "../applications-data.injectable";
import selectedApplicationInjectable from "../selected-application.injectable";
import type { ShowApplicationDetails } from "../show-application-details.injectable";
import showApplicationDetailsInjectable from "../show-application-details.injectable";
import { getHealthSeverity } from "../workload-status";
import { HealthBadge } from "./health-badge";

enum columnId {
  name = "name",
  namespace = "namespace",
  version = "version",
  managedBy = "managed-by",
  workloads = "workloads",
  status = "status",
  age = "age",
}

interface Dependencies {
  applicationsData: ApplicationsData;
  selectedApplication: IComputedValue<ApplicationReference | undefined>;
  showApplicationDetails: ShowApplicationDetails;
  subscribeStores: SubscribeStores;
  clusterFrameContext: ClusterContext;
  kubeDetailsUrlParam: PageParam<string>;
}

/**
 * Applications are derived from workloads, so there is nothing to select or remove as a whole
 */
const toItemListStore = (applicationsData: ApplicationsData): ItemListStore<Application, false> => ({
  get isLoaded() {
    return applicationsData.isLoaded.get();
  },
  failedLoading: false,
  getTotalCount: () => applicationsData.applications.get().length,
  isSelected: () => false,
  toggleSelection: noop,
  isSelectedAll: () => false,
  toggleSelectionAll: noop,
  pickOnlySelected: () => [],
  removeSelectedItems: async () => {},
});

@observer
class NonInjectedApplications extends React.Component<Dependencies> {
  private readonly loadErrors = observable.array<string>();

  private readonly itemListStore = toItemListStore(this.props.applicationsData);

  componentDidMount() {
    let unsubscribe: Disposer = noop;

    disposeOnUnmount(this, [
      // Which stores are needed depends on what the user may list, which can change while looking
      reaction(
        () => this.props.applicationsData.stores.get(),
        stores => {
          unsubscribe();
          unsubscribe = this.props.subscribeStores(stores, {
            onLoadFailure: error => this.loadErrors.push(String(error)),
          });
        },
        {
          fireImmediately: true,
          equals: comparer.shallow,
        },
      ),
      () => unsubscribe(),
      reaction(() => this.props.clusterFrameContext.contextNamespaces.slice(), () => {
        // clear load errors
        this.loadErrors.length = 0;
      }),
    ]);
  }

  get selectedApplication() {
    const selected = this.props.selectedApplication.get();

    return selected && findApplication(this.props.applicationsData.applications.get(), selected);
  }

  toggleDetails = (application: Application) => {
    const selected = this.props.selectedApplication.get();
    const isSelected = selected?.namespace === application.namespace && selected.name === application.name;
    // The details of one of its objects replace those of the application, which come back on selecting it
    const isShowingDetails = isSelected && !this.props.kubeDetailsUrlParam.get();

    this.props.showApplicationDetails(isShowingDetails ? undefined : application);
  };

  renderLoadErrors() {
    if (this.loadErrors.length === 0) {
      return null;
    }

    return (
      <Icon
        material="warning"
        className="load-error"
        tooltip={{
          children: (
            <>
              {this.loadErrors.map((error, index) => <p key={index}>{error}</p>)}
            </>
          ),
          preferredPositions: TooltipPosition.BOTTOM,
        }}
      />
    );
  }

  render() {
    const { applicationsData } = this.props;

    return (
      <SiblingsInTabLayout>
        <ItemListLayout<Application, false>
          isConfigurable
          isSelectable={false}
          tableId="applications"
          className="Applications"
          store={this.itemListStore}
          getItems={() => applicationsData.applications.get()}
          preloadStores={false} // loading handled in subscribeStores()
          detailsItem={this.selectedApplication}
          onDetails={this.toggleDetails}
          customizeTableRowProps={application => ({ testId: `application-row-for-${application.getId()}` })}
          sortingCallbacks={{
            [columnId.name]: application => application.name,
            [columnId.namespace]: application => application.namespace,
            [columnId.version]: application => application.versions[0] ?? "",
            [columnId.managedBy]: application => application.managers[0] ?? "",
            [columnId.workloads]: application => application.workloads.length,
            [columnId.status]: application => getHealthSeverity(application.status.health),
            [columnId.age]: application => -application.oldestWorkload.getCreationTimestamp(),
          }}
          searchFilters={[
            application => application.name,
            application => application.namespace,
            application => application.versions,
            application => application.managers,
            application => application.status.health,
            application => application.workloads.map(({ object }) => object.getName()),
          ]}
          customizeHeader={({ filters, searchProps, info, ...headerPlaceholders }) => ({
            filters: (
              <>
                {filters}
                <NamespaceSelectFilter id="applications-namespace-select-filter-input" />
              </>
            ),
            searchProps: {
              ...searchProps,
              placeholder: "Search Applications...",
            },
            info: (
              <>
                {info}
                {this.renderLoadErrors()}
              </>
            ),
            ...headerPlaceholders,
          })}
          renderHeaderTitle="Applications"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Version", className: "version", sortBy: columnId.version, id: columnId.version },
            { title: "Managed by", className: "managed-by", sortBy: columnId.managedBy, id: columnId.managedBy },
            { title: "Workloads", className: "workloads", sortBy: columnId.workloads, id: columnId.workloads },
            { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={application => [
            application.name,
            <NamespaceSelectBadge key="namespace" namespace={application.namespace} />,
            application.versions.join(", "),
            application.managers.join(", "),
            application.workloads.length,
            <HealthBadge
              key="status"
              health={application.status.health}
              tooltip={application.status.description}
            />,
            <KubeObjectAge key="age" object={application.oldestWorkload} />,
          ]}
          spinnerTestId="applications-spinner"
        />
      </SiblingsInTabLayout>
    );
  }
}

export const Applications = withInjectables<Dependencies>(NonInjectedApplications, {
  getProps: (di, props) => ({
    ...props,
    applicationsData: di.inject(applicationsDataInjectable),
    selectedApplication: di.inject(selectedApplicationInjectable),
    showApplicationDetails: di.inject(showApplicationDetailsInjectable),
    subscribeStores: di.inject(subscribeStoresInjectable),
    clusterFrameContext: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
    kubeDetailsUrlParam: di.inject(kubeDetailsUrlParamInjectable),
  }),
});
