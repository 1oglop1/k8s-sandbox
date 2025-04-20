import * as yaml from "js-yaml";

import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { K8sChartArgs } from "../..";

import Handlebars from "handlebars";
import { mkResourceNameFn } from "../../../resourceName";


interface ArgoCDArgs extends K8sChartArgs {

}

/**
 * Deploys ArgoCD to a Kubernetes cluster.
 * username: admin
 * $ kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
 */
export class ArgoCD extends pulumi.ComponentResource {
  constructor(name: string, args: ArgoCDArgs, opts?: pulumi.ResourceOptions) {
    super("bluecode:kubernetes:charts:argocd:ArgoCD", name, {}, opts);

    const { provider, version } = args;
    const parent = this;
    const rcName = mkResourceNameFn(`${name}-`)
    const namespace = new k8s.core.v1.Namespace(
      rcName("namespace"),
      {
        metadata: {
          name: "argocd",
        },
      },
      { parent, provider }
    );

    new k8s.helm.v3.Release(
      rcName("chart"),
      {
        chart: "argo-cd",
        name: "argocd",
        namespace: namespace.metadata.name,
        repositoryOpts: { repo: "https://argoproj.github.io/argo-helm" },
        version,
        values: {
          // https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md#general-parameters
          // https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
          configs: {
            // secret: {
            //   "argocdServerAdminPassword": "$apr1$NIyIm/Yn$rZi0NKv7q6suJtgYGg6/X0", //"1234qwer", // will this work? does it need to be bcrypt?
            //   "argocdServerAdminPasswordMtime": "2020-09-01T10:11:12Z"
            // },
            params:
             {
              "server.insecure": "true",
              "server.disable.auth": "true"
             },
            cm: {
              
              "admin.enabled": "true",
              "exec.enabled": "true",
              "kustomize.buildOptions": "--enable-helm --load-restrictor=LoadRestrictionsNone",
              "users.anonymous.enabled": "false",
              url: "argocd.k8s.orb.local",
              "timeout.reconciliation": "30s", // default 180 - disables argo auto sync
              "timeout.hard.reconciliation": "300s" // default
            },
            rbac: {
              "policy.default": "role:admin",
              scopes: "[groups, email]",
            },
          },
          global: {
            domain: "argocd.k8s.orb.local",
          },
          notifications: {
            cm: {
              create: false,
            },
            secret: {
              create: false,
            },
          },
          server: {
            ingress: {
              enabled: true,
              ingressClassName: "nginx",
              hosts: ["argocd.k8s.orb.local"], // Explicitly define the host
              annotations: {
                "nginx.ingress.kubernetes.io/force-ssl-redirect": "true",
                "nginx.ingress.kubernetes.io/backend-protocol": "HTTP"
              //   // Make sure Traefik prioritizes this route
              //   "traefik.ingress.kubernetes.io/router.priority": "100"
              }
            },
          },
        },
      },
      { dependsOn: [namespace], parent, provider }
    );
  }
}
