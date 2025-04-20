import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface ServiceAccountArgs {
  /**
   * The namespace to create the service account in.
   */
  namespace: pulumi.Input<string>;
  /**
   * The OIDC issuer ARN.
   */
  oidcIssuerArn: pulumi.Input<string>;
  /**
   * The OIDC issuer URL.
   */
  oidcIssuerUrl: pulumi.Input<string>;
  /**
   * The inline policy to attach to the service account.
   */
  inlinePolicy?: pulumi.Input<string | aws.iam.PolicyDocument>;
  /**
   * The ARN of the policy to attach to the service account.
   */
  policyArn?: pulumi.Input<string>;
  /**
   * The roles to assume for the service account.
   */
  assumeRoles?: pulumi.Input<string>[];
  /**
   * The name of the service account.
   */
  serviceAccountName: pulumi.Input<string>;
  /**
   * Under normal circumstances, SA role names are 
   * @default true
   */
  useGeneratedNames?: boolean
}

/**
 * Creates a service account role.
 */
export class ServiceAccount extends pulumi.ComponentResource {
  public readonly role: aws.iam.Role;

  constructor(name: string, args: ServiceAccountArgs, opts?: pulumi.ComponentResourceOptions) {
    super("bluecode:k8s:ServiceAccount", name, args, opts);

    const {
      inlinePolicy,
      namespace,
      oidcIssuerArn,
      oidcIssuerUrl,
      policyArn,
      assumeRoles: roles,
      serviceAccountName,
    } = args;

    const role = new aws.iam.Role(
      name,
      {
        name: args.useGeneratedNames !== false? name: undefined,
        description: pulumi.interpolate`Allow ${namespace}/${serviceAccountName} to access secrets from inside EKS`,
        assumeRolePolicy: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["sts:AssumeRoleWithWebIdentity"],
              Principal: {
                Federated: oidcIssuerArn,
              },
              Condition: pulumi
                .all([oidcIssuerUrl, namespace, serviceAccountName])
                .apply(([url, namespace, serviceAccountName]) => {
                  return {
                    StringLike: {
                      [`${url}:aud`]: "sts.amazonaws.com",
                      [`${url}:sub`]: `system:serviceaccount:${namespace}:${serviceAccountName}`,
                    },
                  };
                }),
            },
          ],
        },
      },
      { deleteBeforeReplace: true, parent: this }
    );

    if (roles && roles.length > 0) {
      new aws.iam.RolePolicy(
        `${name}-role-policy`,
        {
          role,
          policy: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["sts:AssumeRole"],
                Resource: roles,
              },
            ],
          },
        },
        { parent: role }
      );
    }

    if (policyArn) {
      new aws.iam.RolePolicyAttachment(
        `${name}-policy-attachment`,
        {
          role,
          policyArn,
        },
        { parent: role }
      );
    }

    if (inlinePolicy) {
      new aws.iam.RolePolicy(
        `${name}-policy`,
        {
          role,
          policy: inlinePolicy,
        },
        { parent: role }
      );
    }

    this.role = role;
  }
}
