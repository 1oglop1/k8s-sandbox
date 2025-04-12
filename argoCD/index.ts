import * as fs from "node:fs";
import * as path from "node:path";


import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();