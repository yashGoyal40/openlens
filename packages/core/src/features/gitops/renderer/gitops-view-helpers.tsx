/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { ReactiveDuration } from "../../../renderer/components/duration/reactive-duration";

/**
 * Renders e.g. "5m ago", or nothing when the timestamp is not known
 */
export const TimeAgo = ({ timestamp }: { timestamp: string | undefined }) => (
  timestamp
    ? (
      <>
        <ReactiveDuration timestamp={timestamp} />
        {" ago"}
      </>
    )
    : null
);

/**
 * Sorts the most recent timestamps first, like the "Age" column
 */
export const sortByTimestamp = (timestamp: string | undefined) => (
  timestamp
    ? -new Date(timestamp).getTime()
    : undefined
);

/**
 * Shortens the commit SHAs and digests within revisions such as "main@sha1:<40 hex digits>" for display in lists
 */
export const shortenRevision = (revision: string | undefined) => (
  revision?.replace(/\b([0-9a-f]{12})[0-9a-f]{28,}\b/g, "$1")
);
