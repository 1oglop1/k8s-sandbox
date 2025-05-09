# k8s / pulumi / helm / kustomize sandbox

https://codefresh.io/blog/creating-temporary-preview-environments-based-pull-requests-argo-cd-codefresh/

https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Pull-Request/#template

**WARNING THIS IS NOT SAFE FOR PRODUCTION**
This project is designed to work with local k8s cluster powerd by [orbstack](https://orbstack.dev/)
The intention is to have a good dev env which is easy to build up and teardown.

```
.
├── argo-apps                 # argoCD apps - helmcharts or kustomized helmchats
├── argoCD                    # argocd deployment
├── helm-chart-chart          # helm chart referencing a local chart
├── helm-kustomize            # helm chart referencing a local chart kustomized with kustomize
├── traefik-example-manifests # plain k8s manifest files of whoami app
└── traefik-whoami            # local helm chart of whoami app
```

## argo-apps
<details>
<summary>Folder structure explanation</summary>

```
argo-apps/
├── base/                               # helm charts 
│   ├── helm-chart-chart/
│   │   ├── Chart.yaml
│   │   └── values.yaml                 # base values 
│   └── traefik-whoami/
│       ├── Chart.yaml
│       ├── templates/
│       └── values.yaml
└── orbstack/
    ├── infra/                          # namespace - application set argoCD/k8s/charts/gitea/gitea.ts
    │   ├── .this-app-is-not-deployed/  # folders starting with . are ignored by ArgoCD
    │   │   └── values.yaml             
    │   ├── helm-chart-chart/           # deployed app to namespace
    │   │   └── values.yaml             # app specific overrides
    │   └── postgres-operator/
    │       └── values.yaml
    └── services/                       # namespace with different services
        ├── hiha/
        └── hihi/
```
</details>

<details>
<summary>Future plans helm charts and kustomize</summary>
```
.
├── base
│   ├── helm                         # Pure Helm charts 
│   │   ├── git-server-min
│   │   ├── postgres-operator
│   │       └── templates
│   └── kustomize                    # Kustomize + Helm combinations
│       └── postgres-operator
│           └── kustomization.yaml
└── orbstack
    ├── infra
    │   ├── helm                     # Helm-specific overrides
    │   │   └── postgres-operator
    │   │       └── values.yaml
    │   └── kustomize                # Kustomize-specific overrides
    │       └── postgres-operator
    │           └── values.yaml      # Values for the Helm part
    │           └── kustomization.yaml  # Optional additional kustomize overrides
    └── services
        ├── helm
        │   └── hiha
        └── kustomize
            └── hihi
```
</details>

## argoCD

Completely local pulumi project which deploys `argoCD`, `gitea`, `ingres-nginx` and other basic things with 
a single `pulumi up`.

```
cd argoCD
asdf install
corepack enable
asdf reshim nodejs
yarn
pulumi up
```


ArgoCD uses `gitea` as a source for applications.
Creating or updating application requires git commit to gitea which is as simple as
```
cd argo-apps
git add . && git commit -am "ok"
```

Useful git function for your shell to simplify workflow -> `git add . && gitpp`
```
function gitpp() {
  # git++
  # makes a commit with a number increased from the last commit message
  # eg: hello -> hello 2 -> hello 3
  git commit -am "$(git --no-pager show -s --format=%s | awk 'BEGIN{FS=OFS=" "} {if($NF ~ /^[0-9]+$/) $NF++; else $NF=$NF" 2"}1')" && git push
}
```
