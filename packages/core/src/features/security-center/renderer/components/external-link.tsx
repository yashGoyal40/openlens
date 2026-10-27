/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { Logger } from "@k8slens/logger";
import { loggerInjectionToken } from "@k8slens/logger";
import type { StrictReactNode } from "@k8slens/utilities";
import type { OpenLinkInBrowser } from "../../../../common/utils/open-link-in-browser.injectable";
import openLinkInBrowserInjectable from "../../../../common/utils/open-link-in-browser.injectable";

export interface ExternalLinkProps {
  href: string | undefined;
  children: StrictReactNode;
}

interface Dependencies {
  openLinkInBrowser: OpenLinkInBrowser;
  logger: Logger;
}

const isWebUrl = (href: string | undefined): href is string => Boolean(href?.match(/^https?:\/\//i));

/**
 * Opens the link in the system browser instead of navigating the cluster frame
 */
const NonInjectedExternalLink = ({ href, children, openLinkInBrowser, logger }: ExternalLinkProps & Dependencies) => {
  if (!isWebUrl(href)) {
    return <>{children}</>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        openLinkInBrowser(href)
          .catch(error => logger.error(`[SECURITY-CENTER]: failed to open ${href}`, error));
      }}
    >
      {children}
    </a>
  );
};

export const ExternalLink = withInjectables<Dependencies, ExternalLinkProps>(NonInjectedExternalLink, {
  getProps: (di, props) => ({
    ...props,
    openLinkInBrowser: di.inject(openLinkInBrowserInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
