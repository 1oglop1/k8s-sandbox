# Things

`cp .env.example .env`
`direnv allow`
`asdf install`
`corepack enablle`
`asdf reshim nodejs` 

`pulumi up`

`helm status argocd -n argocd` 
After reaching the UI the first time you can login with username: admin and the random password generated during the installation. You can find the password by running:

kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

## Connect to postgres

forward the port the container 