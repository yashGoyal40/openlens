/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { Ingress, Service } from "@k8slens/kube-object";
import type { Application } from "./applications";

const selectorMatches = (selector: Partial<Record<string, string>> | undefined, labels: Partial<Record<string, string>>) => {
  const requirements = Object.entries(selector ?? {});

  // A service without selector does not select pods (its endpoints are managed by hand)
  return requirements.length > 0 && requirements.every(([key, value]) => labels[key] === value);
};

/**
 * The services in the application's namespace that select the pods of any of its workloads
 */
export const getApplicationServices = (application: Application, services: Service[]) => (
  services.filter(service => (
    service.getNs() === application.namespace
    && application.workloads.some(({ podLabels }) => selectorMatches(service.spec.selector, podLabels))
  ))
);

interface MaybeServiceBackend {
  // extensions/v1beta1
  serviceName?: string;
  // networking.k8s.io/v1
  service?: { name: string };
}

const getBackendServiceName = (backend: MaybeServiceBackend | undefined) => backend?.service?.name ?? backend?.serviceName;

export const getIngressServiceNames = (ingress: Ingress) => {
  const backends: (MaybeServiceBackend | undefined)[] = [
    ingress.spec.defaultBackend,
    ingress.spec.backend,
    ...ingress.getRules().flatMap(rule => rule.http?.paths.map(path => path.backend) ?? []),
  ];

  return new Set(backends.map(getBackendServiceName).filter(Boolean));
};

/**
 * The ingresses in the services' namespace that route to any of the services
 */
export const getIngressesRoutingTo = (services: Service[], ingresses: Ingress[]) => (
  ingresses.filter(ingress => {
    const serviceNames = getIngressServiceNames(ingress);

    return services.some(service => service.getNs() === ingress.getNs() && serviceNames.has(service.getName()));
  })
);
