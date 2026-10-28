/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./kube-event-details.module.scss";

import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import { KubeObject } from "@k8slens/kube-object";
import { DrawerTitle } from "../drawer";
import { cssNames, prevDefault } from "@k8slens/utilities";
import { ReactiveDuration } from "../duration/reactive-duration";
import type { EventStore } from "./store";
import type { Logger } from "@k8slens/logger";
import { withInjectables } from "@ogre-tools/injectable-react";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import eventStoreInjectable from "./store.injectable";
import { loggerInjectionToken } from "@k8slens/logger";
import type { ShowDetails } from "../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../kube-detail-params/show-details.injectable";

export interface KubeEventDetailsProps {
  object: KubeObject;
}

interface Dependencies {
  subscribeStores: SubscribeStores;
  eventStore: EventStore;
  logger: Logger;
  showDetails: ShowDetails;
}

@observer
class NonInjectedKubeEventDetails extends React.Component<KubeEventDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [
      this.props.subscribeStores([
        this.props.eventStore,
      ]),
    ]);
  }

  render() {
    const { object, eventStore, showDetails } = this.props;

    if (!object) {
      return null;
    }

    if (!(object instanceof KubeObject)) {
      this.props.logger.error("[KubeEventDetails]: passed object that is not an instanceof KubeObject", object);

      return null;
    }

    const events = eventStore.getEventsByObject(object);

    return (
      <div>
        <DrawerTitle>
          <span>Events</span>
        </DrawerTitle>
        {events.length > 0 && (
          <div className={styles.KubeEventDetails} role="table">
            <div className={styles.header} role="row">
              <span role="columnheader">Summary</span>
              <span role="columnheader">Count</span>
              <span role="columnheader">Age</span>
            </div>
            {events.map(event => (
              <div
                key={event.getId()}
                className={cssNames(styles.event, { [styles.warning]: event.isWarning() })}
                role="row"
                title={event.message}
                onClick={prevDefault(() => showDetails(event.selfLink, false))}
                data-testid={`kube-event-${event.getId()}`}
              >
                <span className={styles.summary}>{event.message}</span>
                <span>{event.count}</span>
                <span>
                  <ReactiveDuration timestamp={event.lastTimestamp ?? event.metadata.creationTimestamp} />
                </span>
              </div>
            ))}
          </div>
        )}
        {events.length === 0 && (
          <div className={styles.empty}>
            No events found
          </div>
        )}
      </div>
    );
  }
}

export const KubeEventDetails = withInjectables<Dependencies, KubeEventDetailsProps>(NonInjectedKubeEventDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    eventStore: di.inject(eventStoreInjectable),
    logger: di.inject(loggerInjectionToken),
    showDetails: di.inject(showDetailsInjectable),
  }),
});



