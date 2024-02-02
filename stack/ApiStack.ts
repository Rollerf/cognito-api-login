import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { userPool } from "./CognitoStack";
import { createLambda } from "./LambdaStack";
import { getLambdaDefinitions } from "./LambdaConfig";

const config = new pulumi.Config();

export const api = new aws.apigateway.RestApi("restApi-"
    + config.require("stageName"), {});
const resource = new aws.apigateway.Resource("congnitoAuthorizerResource-"
    + config.require("stageName"),
    {
        restApi: api.id,
        parentId: api.rootResourceId,
        pathPart: "cognito-authorized",
    }, { dependsOn: [api] });

// Create authorizer for the API
const restAuthorizer = new aws.apigateway.Authorizer("apiRestAuthorizer-"
    + config.require("stageName"), {
    restApi: api.id,
    type: "COGNITO_USER_POOLS",
    providerArns: [userPool.arn],
    identitySource: "method.request.header.Authorization"
}, { dependsOn: [userPool, api] });

// Get Lambda definitions
const lambdaDefinitions = getLambdaDefinitions(api, restAuthorizer, resource);

const integrations = lambdaDefinitions.map(
    definition => createLambda(definition));

//Create a deployment of the API
export const deployment = new aws.apigateway.Deployment("myRestApiDeployment"
    + config.require("stageName"), {
    restApi: api.id,
    stageName: config.require("stageName"),
}, { dependsOn: integrations, ignoreChanges: ["triggers"] });