import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { userPoolClient, userPoolDomain } from "./stack/CognitoStack";
import { deployment, api } from "./stack/ApiStack";

//Export variables
export const url =
    pulumi.interpolate`https://${api.id}.execute-api.${aws.config.region}.amazonaws.com/${deployment.stageName}`;
export const clientId = pulumi.interpolate`${userPoolClient.id}`;
export const authUrl =
    pulumi.interpolate`https://${userPoolDomain.domain}.auth.${aws.config.region}.amazoncognito.com/login`;
export const redirectUrl = userPoolClient.defaultRedirectUri;