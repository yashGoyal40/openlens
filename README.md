# OpenLens, revived

A community fork of [OpenLens](https://github.com/lensapp/lens/tree/master), the open-source Kubernetes IDE.
Mirantis retired the open-source version in 2023 and stopped taking changes to it. This fork starts from
its last code (`lensapp/lens` `master`, version 6.5) and keeps it going: newer Kubernetes APIs, GitOps,
security and cost views, metrics that work without Prometheus, and a reworked interface.

It is free and MIT licensed, and needs no account.

> Not affiliated with or endorsed by Mirantis. "Lens" is a trademark of Mirantis, Inc.
> No code from the proprietary Lens Desktop is included; new features are written from the public
> Kubernetes and project APIs.

## What's new compared to OpenLens 6.5

### Kubernetes APIs

- **Gateway API**: GatewayClasses, Gateways, HTTPRoutes, GRPCRoutes, TLS/TCP/UDP routes, ReferenceGrants
  and BackendTLSPolicies.
- **Dynamic Resource Allocation**: DeviceClasses, ResourceClaims, ResourceClaimTemplates and ResourceSlices.
- **Admission policies**: validating and mutating admission policies and their bindings.

### GitOps

- **Argo CD**: Applications, ApplicationSets and AppProjects.
- **Flux**: Kustomizations, HelmReleases and their sources (Git and OCI repositories, Helm repositories
  and charts, buckets).

### Security and cost

- **Security Center**: reports from the [Trivy Operator](https://github.com/aquasecurity/trivy-operator):
  vulnerabilities, config audits, exposed secrets, RBAC and infrastructure assessments, compliance.
- **Cost monitoring**: cost per namespace from [OpenCost](https://www.opencost.io).

### Workloads

- **Applications** view, which groups workloads, services and ingresses by their `app.kubernetes.io` labels.
- **Metrics without Prometheus**: CPU and memory charts in the details panel of pods, containers,
  deployments, stateful sets, daemon sets, replica sets, jobs, namespaces and nodes, read from
  metrics-server. Persistent volume claims show disk usage from the kubelet. metrics-server keeps no
  history, so the charts build up while the app runs (up to 6 hours). Prometheus is still used when the
  cluster has it.
- CPU and memory columns for pods, and **Node Pool** and **Instance Type** columns for pods and nodes.
- **CronJobs**: next run (in the CronJob's time zone and yours), time zone column and job history.
- Actions in the details panel: attach, shell, evict and logs for pods; shell, cordon and drain for nodes;
  logs for a whole workload.
- **Pod logs**: all containers merged in time order, with log levels highlighted.
- **CSV export** of any list.
- Resource editor with save, reload, a diff of your changes and find, plus readable YAML errors that jump
  to the line.

### Interface

- Navigator sidebar with a cluster switcher and filter.
- Tabs for open views.
- Reworked hotbar.
- Namespace picker with checkboxes.
- Cluster overview built from metrics-server.
- Dark theme for dialogs and notifications.
- Resizable list columns.

## Install

There are no prebuilt downloads yet, so build it from source.

## Building

Only macOS on Apple Silicon has been tested. The Linux and Windows build settings inherited from upstream
are still there, but untested.

You need:

- Node.js 20
- npm 9 (`npm run all:install` fetches it for you)
- Python 3 with `distutils`, for the native modules. On macOS, `/usr/bin/python3` works.

```sh
git clone https://github.com/yashGoyal40/openlens.git
cd openlens
PYTHON=/usr/bin/python3 npm run all:install
npm run build

cd open-lens
CSC_IDENTITY_AUTO_DISCOVERY=false PYTHON=/usr/bin/python3 npx electron-builder --mac dir --arm64 --publish never
codesign --force --deep --sign - dist/mac-arm64/OpenLens.app
```

The app is then at `open-lens/dist/mac-arm64/OpenLens.app`. To get a disk image instead, use
`--mac dmg`. The app isn't signed with a developer certificate. The first time you open it, macOS
asks you to allow it under *System Settings → Privacy & Security*.

## Development

- `npm run dev` builds the packages in development mode.
- `npm run start-dev` runs the app.
- `npm run test:unit` runs the tests.
- `npm run lint` checks the code.

## Contributing

Issues and pull requests are welcome at [github.com/yashGoyal40/openlens](https://github.com/yashGoyal40/openlens/issues).

## License

MIT, see [LICENSE](LICENSE). Based on OpenLens by the OpenLens Authors.
