import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { helloHandler } from "../lambdas/helloHandler";
import { userPool } from "./CognitoStack";

export const api = new aws.apigateway.RestApi("api", {});

// Add permissions for the Lambda function to be called by API Gateway
const lambdaPermission = new aws.lambda.Permission("lambdaPermission", {
    action: "lambda:InvokeFunction",
    principal: "apigateway.amazonaws.com",
    function: helloHandler.arn,
    sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
}, { dependsOn: [helloHandler, api] });

const resource = new aws.apigateway.Resource("myResource", {
    restApi: api.id,
    parentId: api.rootResourceId,
    pathPart: "cognito-authorized",
}, { dependsOn: [api] });

// Create authorizer for the API
const restAuthorizer = new aws.apigateway.Authorizer("rest-authorizer", {
    restApi: api.id,
    type: "COGNITO_USER_POOLS",
    providerArns: [userPool.arn],
    identitySource: "method.request.header.Authorization"
}, { dependsOn: [userPool, api] });

const method = new aws.apigateway.Method("myMethod", {
    restApi: api.id,
    resourceId: resource.id,
    httpMethod: "GET",
    authorization: "COGNITO_USER_POOLS",
    authorizerId: restAuthorizer.id,
    authorizationScopes: ["email", "openid"]
}, { dependsOn: [restAuthorizer] });

//Create an integration for the API. The integration will call the Lambda function.
const integration = new aws.apigateway.Integration("myIntegration", {
    restApi: api.id,
    resourceId: method.resourceId,
    httpMethod: method.httpMethod,
    type: "AWS_PROXY",
    uri: helloHandler.invokeArn,
    integrationHttpMethod: "POST",
}, { dependsOn: [method] });

//Create a deployment of the API
export const deployment = new aws.apigateway.Deployment("myRestApiDeployment", {
    restApi: api.id,
    stageName: "dev",
}, { dependsOn: [restAuthorizer, integration], ignoreChanges: ["triggers"] });