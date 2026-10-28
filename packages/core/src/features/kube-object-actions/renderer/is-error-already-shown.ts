/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { JsonApiErrorParsed } from "@k8slens/json-api";

/**
 * Requests that are refused for lack of permission already show a notification of their own
 */
export const isErrorAlreadyShown = (error: unknown) => error instanceof JsonApiErrorParsed && error.isUsedForNotification;
