import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { checkEmailHandler } from "../lambda-handlers/checkEmailExistsHandler";

// Get config
const config = new pulumi.Config();

// Create a Cognito User Pool of authorized users
export const userPool = new aws.cognito.UserPool("user-pool-"
    + config.require("stageName"), {
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
    lambdaConfig: {
        preSignUp: checkEmailHandler.arn,
    }
}, { dependsOn: [checkEmailHandler] });

// Create a user pool domain
export const userPoolDomain = new aws.cognito.UserPoolDomain("cognitoPoolDomain-"
    + config.require("stageName"), {
    domain: "auth-api-test-domain",
    userPoolId: userPool.id,
}, { deleteBeforeReplace: true, dependsOn: [userPool] });

// Google identity provider configuration
const googleProvider = new aws.cognito.IdentityProvider("googleIdentityProvider-"
    + config.require("stageName"), {
    providerName: "Google",
    userPoolId: userPool.id,
    providerType: "Google",
    providerDetails: {
        // The following need to be obtained from your Google Developer Console:
        client_id: config.requireSecret("google_idp_clientId"),
        client_secret: config.requireSecret("google_idp_secret"),
        // The "authorize_scopes" can be adjusted based on the required permissions.
        authorize_scopes: "email openid",
    },
    attributeMapping: {
        email: "email",
        username: "sub"
    },
}, { dependsOn: [userPool] });

export const userPoolClient = new aws.cognito.UserPoolClient("userPoolClient-" + config.require("stageName"), {
    userPoolId: userPool.id,
    explicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
    allowedOauthFlows: ["code"],
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthScopes: ["email", "openid"],
    callbackUrls: ["http://localhost:4200/"],
    defaultRedirectUri: "https://www.example.com",
    generateSecret: false,
    supportedIdentityProviders: ["COGNITO", "Google"],
    logoutUrls: ["http://localhost:4200/logout"]
}, { dependsOn: [googleProvider] });

// IAM role for the Lambda function
const lambdaRole = new aws.iam.Role("lambdaCognitoRole-"
    + config.require("stageName"), {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "lambda.amazonaws.com",
            },
        }],
    },
});

const lambdaCognitoPolicy = new aws.iam.Policy("lambdaCognitoPolicy"
    + config.require("stageName"),
    {
        policy: {
            Version: "2012-10-17",
            Statement: [{
                Action: [
                    "cognito-idp:ListUsers",
                ],
                Resource: userPool.arn,
                Effect: "Allow",
            }],
        },
    });

// Attach the policy to the Lambda IAM role
new aws.iam.RolePolicyAttachment("lambdaCognitoRolePolicyAttachment-"
    + config.require("stageName"), {
    role: lambdaRole,
    policyArn: lambdaCognitoPolicy.arn,
}, { dependsOn: [lambdaCognitoPolicy, lambdaRole] });

// Grant the Cognito User Pool permission to invoke the Lambda function
new aws.lambda.Permission("cognitoPermissionForLambda-"
    + config.require("stageName"),
    {
        action: "lambda:InvokeFunction",
        function: checkEmailHandler,
        principal: "cognito-idp.amazonaws.com",
        sourceArn: userPool.arn
    });

// Create a CloudWatch Log Group associated with the Lambda function.
const logGroup = new aws.cloudwatch.LogGroup(
    "cognitoCloudWatchLogGroup-"
    + config.require("stageName"),
    {
        name: pulumi.interpolate`/aws/lambda/${checkEmailHandler.name}`,
        retentionInDays: 30,
    },
    { dependsOn: [checkEmailHandler] });

// Specify the Lambda function to attach the Log Group.
new aws.lambda.Permission("cognitoCloudWatchLogGroup-"
    + config.require("stageName"),
    {
        action: "lambda:InvokeFunction",
        function: checkEmailHandler,
        principal: "logs.amazonaws.com",
        sourceArn: logGroup.arn,
    });