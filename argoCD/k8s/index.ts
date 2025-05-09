import * as k8s from "@pulumi/kubernetes";

export interface K8sChartArgs {
  env?: string,
  provider: k8s.Provider;
  version: string;
}

export * as charts from "./charts";
export * as serviceAccount from "./service-account";
