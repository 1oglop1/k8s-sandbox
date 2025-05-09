### Upgrading

When upgrading, make sure to get the right CRDs and replace the existing ones under `templates`.

```shell
wget https://raw.githubusercontent.com/zalando/postgres-operator/v1.13.0/charts/postgres-operator/crds/operatorconfigurations.yaml
wget https://raw.githubusercontent.com/zalando/postgres-operator/v1.13.0/charts/postgres-operator/crds/postgresqls.yaml
wget https://raw.githubusercontent.com/zalando/postgres-operator/v1.13.0/charts/postgres-operator/crds/postgresteams.yaml
```
