/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { isObject, isString } from "@k8slens/utilities";
import { getErrorMessage } from "../../../common/utils/get-error-message";

/**
 * Forbidden GET requests reject with the raw `Status` object of the Kubernetes API instead of
 * a parsed error, so prefer its message over the JSON of the whole object.
 */
export const getRequestErrorMessage = (error: unknown): string => {
  if (isObject(error) && isString(error.message)) {
    return error.message;
  }

  return getErrorMessage(error) || "Unknown error";
};
