import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { K8sChartArgs } from "../..";
import { mkResourceNameFn } from "../../../resourceName";

interface GiteaArgs extends K8sChartArgs {
  hostname: string;
  namespace: pulumi.Input<string>;
  version: "11.0.1" | string;
  username: pulumi.Input<string>;
  password: pulumi.Input<string>;
}

/**
 * Deploys ArgoCD to a Kubernetes cluster.
 * username: gitea_admin
 * passowrd: gitea_admin
 */
export class Gitea extends pulumi.ComponentResource {
  constructor(name: string, args: GiteaArgs, opts?: pulumi.ResourceOptions) {
    super("bluecode:kubernetes:charts:Gitea", name, {}, opts);

    const { provider, version, hostname, namespace, username, password } = args;
    const parent = this;
    const rcName = mkResourceNameFn(`${name}-`)

    const giteaRelease = new k8s.helm.v3.Release(
      rcName("gitea"),
      {
        chart: "gitea",
        version,
        repositoryOpts: {
          repo: "https://dl.gitea.io/charts/",
        },
        namespace: namespace,
        createNamespace: true,
        values: {
          "redis-cluster": {
            enabled: false,
          },
          redis: {
            enabled: false,
          },
          postgresql: {
            enabled: false,
          },
          "postgresql-ha": {
            enabled: false,
          },
          persistence: {
            enabled: false,
          },
          gitea: {
            config: {
              database: {
                DB_TYPE: "sqlite3",
              },
              session: {
                PROVIDER: "memory",
              },
              cache: {
                ADAPTER: "memory",
              },
              queue: {
                TYPE: "level",
              },
              repository: {
                DEFAULT_PUSH_CREATE_PRIVATE: false, // Make repositories public by default
                ENABLE_PUSH_CREATE_USER: true,
                ENABLE_PUSH_CREATE_ORG: true,
                DEFAULT_PRIVATE: false, //
              },
              service: {
                DISABLE_REGISTRATION: true, // Prevent new users from registering
              },
            },
            admin: {
              username,
              password, // Use a secure password in production
              email: "admin@example.com",
              existingSecret: "",
              createSecret: true,
              keepUpdated: true,
            },
          },
          ingress: {
            enabled: true,
            className: "nginx",
            annotations: {
              "nginx.ingress.kubernetes.io/force-ssl-redirect": "true",
              "nginx.ingress.kubernetes.io/backend-protocol": "HTTP",
            },
            hosts: [
              {
                host: hostname,
                paths: [
                  {
                    path: "/",
                    pathType: "Prefix",
                  },
                ],
              },
            ],
          },
        },
      },
      { parent, provider }
    );
  }
}

export interface GiteaArgoCdArgs {
  provider: k8s.Provider;
  repoUrl: pulumi.Input<string>;
  username: pulumi.Input<string>;
  password: pulumi.Input<string>;
  clusterName: pulumi.Input<string>;
  namespace: string;
}

export class GiteaArgoCd extends pulumi.ComponentResource {
  constructor(name: string, args: GiteaArgoCdArgs, opts?: pulumi.ResourceOptions) {
    super("bluecode:kubernetes:charts:GiteaArgoCd", name, {}, opts);

    const { provider, repoUrl, username, password, clusterName, namespace} = args;
    const parent = this;
    const rcName = mkResourceNameFn(`${name}-`)
    // Create the Gitea repository credentials secret for ArgoCD
    const giteaRepoSecret = new k8s.core.v1.Secret(rcName("gitea-repo-creds"), {
      metadata: {
        // name: "gitea-repo-creds",
        name: rcName("gitea-repo-creds"),
        namespace: "argocd",
        labels: {
          "argocd.argoproj.io/secret-type": "repository",
        },
      },
      type: "Opaque",
      stringData: {
        type: "git",
        url: repoUrl,
        username: username,
        password: password,
      },
    },{ parent, provider });

    // Create a separate ApplicationSet for the clusterName/infra namespace
    // const infraAppSet = new k8s.apiextensions.CustomResource(rcName("infra-apps"), {
    //   apiVersion: "argoproj.io/v1alpha1",
    //   kind: "ApplicationSet",
    //   metadata: {
    //     name: `infra-apps`,
    //     namespace: "argocd",
    //   },
    //   spec: {
    //       "ignoreApplicationDifferences": [ 
    //         {
    //           "jsonPointers": [
    //             "/spec/syncPolicy"
    //           ]
    //         }
    //       ],
    //     generators: [
    //       {
    //         git: {
    //           repoURL: repoUrl,
    //           revision: "HEAD",
    //           directories: [
    //             {path: `${clusterName}/infra/*`},
    //             {path: `${clusterName}/infra/.*`, exclude: true},
    //           ],
    //         },
    //       },
    //     ],
    //     template: {
    //       metadata: {
    //         name: "infra-{{path.basename}}", // app-infra format
    //       },
    //       spec: {
    //         project: "default",
    //         source: {
    //           repoURL: repoUrl,
    //           targetRevision: "HEAD",
    //           path: "{{path}}",
    //           helm: {
    //             valueFiles: [
    //               "values.yaml",
    //               "../../ENV_PATH/NAMESPACE/{{path.basename}}/values.yaml" // this needs to be fixed
    //             ],
    //             ignoreMissingValueFiles: true
    //           }
    //         },
    //         destination: {
    //           server: "https://kubernetes.default.svc",
    //           namespace: "infra", 
    //         },
    //         syncPolicy: {
    //           automated: {
    //             prune: true,
    //             selfHeal: true,
    //           },
    //           syncOptions: [
    //             "CreateNamespace=true",
    //             "FailOnSharedResource=true"
    //           ],
    //         },
    //       },
    //     },
    //   },
    // },{ parent, provider });
    
    const basePath = "base"
    
    const infraAppSet = new k8s.apiextensions.CustomResource(rcName("apps"), {
      apiVersion: "argoproj.io/v1alpha1",
      kind: "ApplicationSet",
      metadata: {
        labels: {
          "app.kubernetes.io/name": `${namespace}-apps`
        },
        // annotations: {
        //   "notifications.argoproj.io/subscribe.on-deployed.github": "",
        //   "notifications.argoproj.io/subscribe.on-sync-failed.github": ""
        // },
        name: `${namespace}-apps`,
        namespace: "argocd",
      },
      spec: {
        ignoreApplicationDifferences: [
          {
            jsonPointers: [
              "/spec/syncPolicy"
            ]
          }
        ],
        generators: [
          {
            git: {
              repoURL: repoUrl,
              revision: "HEAD",
              directories: [
                {path: `${clusterName}/${namespace}/*`},
                {path: `${clusterName}/${namespace}/.*`, exclude: true},
              ],
            },
          },
        ],
        template: {
          metadata: {
            name: `${namespace}-{{path.basename}}`,
          },
          spec: {
            project: "default",
            source: {
              repoURL: repoUrl,
              targetRevision: "HEAD",
              path: `${basePath}/{{path.basename}}`,
              helm: {
                valueFiles: [
                  "values.yaml",
                  `../../${clusterName}/${namespace}/{{path.basename}}/values.yaml`
                ],
                ignoreMissingValueFiles: true
              }
            },
            destination: {
              name: "in-cluster",
              namespace: namespace,
            },
            ignoreDifferences: [
              {
                group: "apps",
                kind: "Deployment",
                jsonPointers: [
                  "/spec/replicas"
                ]
              }
            ],
            syncPolicy: {
              automated: {
                prune: true,
                selfHeal: true,
              },
              syncOptions: [
                "CreateNamespace=true",
                "FailOnSharedResource=true"
              ],
            },
          },
        },
      },
    }, { parent, provider });
  
  }

}
