import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { helloHandler } from "./helloHandler";

// Create a Cognito User Pool of authorized users
const userPool = new aws.cognito.UserPool("user-pool", {
    usernameAttributes: ["email"],
    autoVerifiedAttributes: ["email"],
    accountRecoverySetting: {
        recoveryMechanisms: [
            {
                name: "verified_email",
                priority: 1,
            },
        ]
    },
    emailVerificationMessage: "Please click the link below to verify your email address: {####}",
    emailVerificationSubject: "Verify Your Email for Our Awesome App",
});
const userPoolClient = new aws.cognito.UserPoolClient("user-pool-client", {
    userPoolId: userPool.id,
    explicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
    allowedOauthFlows: ["code"],
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthScopes: ["email", "openid"],
    callbackUrls: ["http://localhost:3000/", "https://www.example.com"],
    defaultRedirectUri: "https://www.example.com",
    generateSecret: true,
    supportedIdentityProviders: ["COGNITO"],
    logoutUrls: ["http://localhost:3000/", "https://www.example.com"]
});

// Create a user pool domain
const userPoolDomain = new aws.cognito.UserPoolDomain("cognito-domain", {
    domain: "my-test-domain",
    userPoolId: userPool.id,
}, { deleteBeforeReplace: true, dependsOn: [userPool] });

const api = new aws.apigateway.RestApi("api", {});

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
const deployment = new aws.apigateway.Deployment("myRestApiDeployment", {
    restApi: api.id,
    stageName: "dev",
}, { dependsOn: [restAuthorizer, integration], ignoreChanges: ["triggers"] });

//Export variables
export const url =
    pulumi.interpolate`https://${api.id}.execute-api.${aws.config.region}.amazonaws.com/${deployment.stageName}`;
export const clientId = pulumi.interpolate`${userPoolClient.id}`;
export const authUrl =
    pulumi.interpolate`https://${userPoolDomain.domain}.auth.${aws.config.region}.amazoncognito.com/login`;
export const redirectUrl = userPoolClient.defaultRedirectUri;