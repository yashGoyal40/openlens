/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createResourceRouteInjectables } from "../../resource-views/common/create-resource-route-injectables";
import {
  mutatingAdmissionPoliciesDescriptor,
  mutatingAdmissionPolicyBindingsDescriptor,
  validatingAdmissionPoliciesDescriptor,
  validatingAdmissionPolicyBindingsDescriptor,
} from "./admission-policies-resources";

export const validatingAdmissionPoliciesRoutes = createResourceRouteInjectables(validatingAdmissionPoliciesDescriptor);
export const validatingAdmissionPoliciesRouteInjectable = validatingAdmissionPoliciesRoutes.routeInjectable;
export const navigateToValidatingAdmissionPoliciesInjectable = validatingAdmissionPoliciesRoutes.navigateInjectable;

export const validatingAdmissionPolicyBindingsRoutes = createResourceRouteInjectables(validatingAdmissionPolicyBindingsDescriptor);
export const validatingAdmissionPolicyBindingsRouteInjectable = validatingAdmissionPolicyBindingsRoutes.routeInjectable;
export const navigateToValidatingAdmissionPolicyBindingsInjectable = validatingAdmissionPolicyBindingsRoutes.navigateInjectable;

export const mutatingAdmissionPoliciesRoutes = createResourceRouteInjectables(mutatingAdmissionPoliciesDescriptor);
export const mutatingAdmissionPoliciesRouteInjectable = mutatingAdmissionPoliciesRoutes.routeInjectable;
export const navigateToMutatingAdmissionPoliciesInjectable = mutatingAdmissionPoliciesRoutes.navigateInjectable;

export const mutatingAdmissionPolicyBindingsRoutes = createResourceRouteInjectables(mutatingAdmissionPolicyBindingsDescriptor);
export const mutatingAdmissionPolicyBindingsRouteInjectable = mutatingAdmissionPolicyBindingsRoutes.routeInjectable;
export const navigateToMutatingAdmissionPolicyBindingsInjectable = mutatingAdmissionPolicyBindingsRoutes.navigateInjectable;
