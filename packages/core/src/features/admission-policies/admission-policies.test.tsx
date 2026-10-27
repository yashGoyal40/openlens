/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { ValidatingAdmissionPolicy, ValidatingAdmissionPolicyBinding } from "./common/admission-policies-resources";
import {
  navigateToValidatingAdmissionPoliciesInjectable,
  navigateToValidatingAdmissionPolicyBindingsInjectable,
} from "./common/admission-policies-routes.injectable";
import { storeInjectable as validatingPoliciesStoreInjectable } from "./renderer/validating-admission-policies.injectable";
import { storeInjectable as validatingBindingsStoreInjectable } from "./renderer/validating-admission-policy-bindings.injectable";

describe("admission policies", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;

  beforeEach(() => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();
  });

  describe("given the cluster does not serve admission policies", () => {
    beforeEach(async () => {
      rendered = await builder.render();
    });

    it("does not show the admission policies sidebar group", () => {
      expect(rendered.queryByTestId("sidebar-item-admission-policies")).toBeNull();
    });
  });

  describe("given the cluster serves validating admission policies and their bindings", () => {
    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        builder.allowKubeResource({
          apiName: "validatingadmissionpolicies",
          group: "admissionregistration.k8s.io",
        });
        builder.allowKubeResource({
          apiName: "validatingadmissionpolicybindings",
          group: "admissionregistration.k8s.io",
        });

        const policiesStore = windowDi.inject(validatingPoliciesStoreInjectable);
        const bindingsStore = windowDi.inject(validatingBindingsStoreInjectable);

        policiesStore.items.replace([
          new ValidatingAdmissionPolicy({
            apiVersion: "admissionregistration.k8s.io/v1",
            kind: "ValidatingAdmissionPolicy",
            metadata: {
              name: "replica-limit",
              resourceVersion: "1",
              uid: "replica-limit-uid",
              selfLink: "/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicies/replica-limit",
            },
            spec: {
              failurePolicy: "Ignore",
              paramKind: { apiVersion: "rules.example.com/v1", kind: "ReplicaLimit" },
              matchConstraints: {
                resourceRules: [{
                  apiGroups: ["apps"],
                  apiVersions: ["v1"],
                  operations: ["CREATE", "UPDATE"],
                  resources: ["deployments", "statefulsets"],
                }],
              },
              validations: [
                { expression: "object.spec.replicas <= params.maxReplicas", reason: "Invalid" },
                { expression: "object.spec.replicas > 0", message: "at least one replica is required" },
              ],
            },
            status: {
              typeChecking: {
                expressionWarnings: [{ fieldRef: "spec.validations[0].expression", warning: "no such key: maxReplicas" }],
              },
            },
          }),
        ]);
        policiesStore.isLoaded = true;

        bindingsStore.items.replace([
          new ValidatingAdmissionPolicyBinding({
            apiVersion: "admissionregistration.k8s.io/v1",
            kind: "ValidatingAdmissionPolicyBinding",
            metadata: {
              name: "replica-limit-production",
              resourceVersion: "1",
              uid: "replica-limit-production-uid",
              selfLink: "/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicybindings/replica-limit-production",
            },
            spec: {
              policyName: "replica-limit",
              validationActions: ["Deny", "Audit"],
              paramRef: { name: "production-limit", namespace: "policies", parameterNotFoundAction: "Deny" },
            },
          }),
        ]);
        bindingsStore.isLoaded = true;
      });

      rendered = await builder.render();
    });

    describe("when the config sidebar item is expanded", () => {
      beforeEach(() => {
        fireEvent.click(rendered.getByTestId("link-for-sidebar-item-config"));
      });

      it("shows the admission policies sidebar group", () => {
        expect(rendered.getByTestId("sidebar-item-admission-policies")).toBeInTheDocument();
      });

      describe("when the admission policies sidebar group is expanded", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByTestId("link-for-sidebar-item-admission-policies"));
        });

        it("shows validating policies and bindings, but not kinds the cluster does not serve", () => {
          expect(rendered.getByTestId("sidebar-item-admission-policies-validating-policies")).toBeInTheDocument();
          expect(rendered.getByTestId("sidebar-item-admission-policies-validating-bindings")).toBeInTheDocument();
          expect(rendered.queryByTestId("sidebar-item-admission-policies-mutating-policies")).toBeNull();
        });
      });
    });

    describe("when navigating to validating policies", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToValidatingAdmissionPoliciesInjectable);
      });

      it("shows the list title", () => {
        expect(rendered.getByText("Validating Policies", { selector: "h5" })).toBeInTheDocument();
      });

      it("shows the policy with its failure policy, matched resources and param kind", () => {
        expect(rendered.getByText("replica-limit")).toBeInTheDocument();
        expect(rendered.getByText("Ignore")).toBeInTheDocument();
        expect(rendered.getByText("apps/deployments, apps/statefulsets")).toBeInTheDocument();
        expect(rendered.getByText("ReplicaLimit (rules.example.com/v1)")).toBeInTheDocument();
      });

      it("shows the type checking warnings", () => {
        expect(rendered.getByTitle("spec.validations[0].expression: no such key: maxReplicas")).toBeInTheDocument();
      });

      describe("when the details of the policy are opened", () => {
        beforeEach(() => {
          fireEvent.click(rendered.getByText("replica-limit"));
        });

        it("shows the validations with their expressions and messages", () => {
          expect(rendered.getByText("Validations", { selector: ".DrawerTitle" })).toBeInTheDocument();
          expect(rendered.getByText("object.spec.replicas > 0")).toBeInTheDocument();
          expect(rendered.getByText("at least one replica is required")).toBeInTheDocument();
        });

        it("shows the match constraints", () => {
          expect(rendered.getByText("Match Constraints", { selector: ".DrawerTitle" })).toBeInTheDocument();
          expect(rendered.getByText("CREATE, UPDATE")).toBeInTheDocument();
        });
      });
    });

    describe("when navigating to validating bindings", () => {
      beforeEach(() => {
        builder.navigateWith(navigateToValidatingAdmissionPolicyBindingsInjectable);
      });

      it("shows the binding with its policy, validation actions and param", () => {
        expect(rendered.getByText("replica-limit-production")).toBeInTheDocument();
        expect(rendered.getByText("Deny")).toBeInTheDocument();
        expect(rendered.getByText("Audit")).toBeInTheDocument();
        expect(rendered.getByText("policies/production-limit")).toBeInTheDocument();
      });

      it("links the policy name to the policy details", () => {
        expect(rendered.getByText("replica-limit", { selector: "a" })).toBeInTheDocument();
      });
    });
  });
});
