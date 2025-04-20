import * as fs from "node:fs";
import * as path from "node:path";

import * as cmd from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import * as pu8s from "./k8s";
import { parseYaml } from "./k8s/yaml";

const stack = pulumi.getStack();

const provider = new k8s.Provider("orbstack", {
  // cluster: "orbstack",
  context: "orbstack",
});

// --install ingress-nginx ingress-nginx --repo  --namespace ingress-nginx --create-namespace
const namespace = new k8s.core.v1.Namespace(
  "ingress-nginx",
  {
    metadata: {
      name: "ingress-nginx",
    },
  },
  { provider }
);
const ic = new k8s.helm.v3.Release(
  "ingress-nginx",
  {
    chart: "ingress-nginx",
    name: "ingress-nginx",
    namespace: namespace.metadata.name,
    repositoryOpts: { repo: "https://kubernetes.github.io/ingress-nginx" },
    version: "4.12.1",
  },
  { provider }
);

// // new k8s.helm.v4.Chart(
// //   "traefik",
// //   {
// //     chart: "traefik",
// //     name: "traefik",
// //     namespace: "traefik",
// //     version: "34.5.0",
// //     repositoryOpts: { repo: "https://traefik.github.io/charts" },
// //   },
// //   { dependsOn: namespace, provider }
// // );
// Argo is insecure and without password! Great for local dev, bad for everything else
const argo = new pu8s.charts.ArgoCD("argocd", {
  env: "dev",
  provider: provider,
  // version: "7.7.7"
  version: "7.8.23",
}, {dependsOn: [ic]});

const nsSvc = new k8s.core.v1.Namespace(
  "ns-infra",
  {
    metadata: {
      name: "infra",
    },
  },
  { provider }
);

const gitMeta = {
  giteaHostName: "gitea.k8s.orb.local",
  username: "gitea_admin",
  password: "gitea_admin",
  repoName: "apps"
};
const gitea = new pu8s.charts.Gitea("gitea", {
  hostname: gitMeta.giteaHostName,
  namespace: nsSvc.metadata.name,
  username: gitMeta.username,
  password: gitMeta.password,
  provider,
  version: "11.0.1",
}, {dependsOn: [ic]});

new cmd.local.Command(
  "create-git",
  {
    create: fs.readFileSync(path.join(__dirname, "scripts", "gitea-bootstrap.sh"), "utf-8").toString(),
    interpreter: ["/bin/bash", "-c"],
    environment: {
      // Add any environment variables needed here
      GITEA_URL: `https://${gitMeta.giteaHostName}`,
      GITEA_USER: gitMeta.username,
      GITEA_PASS: gitMeta.password,
      REPO_NAME: gitMeta.repoName,
    },
    dir: path.join(__dirname, "..", "argo-apps"),
  },
  {
    dependsOn: [gitea, argo],
  }
).stdout.apply(console.log);

new pu8s.charts.GiteaArgoCd("gitea-argo", {
  repoUrl: `https://${gitMeta.giteaHostName}/${gitMeta.username}/${gitMeta.repoName}`,
  username: gitMeta.username,
  password: gitMeta.password,
  clusterName: "orbstack",
  provider,
  namespace: "infra"
},{dependsOn: [argo, gitea]});
