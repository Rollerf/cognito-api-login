import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { checkEmailHandler } from "../lambdas/checkEmailExistsHandler";

// Get config
const config = new pulumi.Config();

// Create a Cognito User Pool of authorized users
export const userPool = new aws.cognito.UserPool("user-pool", {
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

// Google identity provider configuration
const googleProvider = new aws.cognito.IdentityProvider("google", {
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

export const userPoolClient = new aws.cognito.UserPoolClient("user-pool-client", {
    userPoolId: userPool.id,
    explicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
    allowedOauthFlows: ["code"],
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthScopes: ["email", "openid"],
    callbackUrls: ["http://localhost:3000/", "https://www.example.com"],
    defaultRedirectUri: "https://www.example.com",
    generateSecret: true,
    supportedIdentityProviders: ["COGNITO", "Google"],
    logoutUrls: ["http://localhost:3000/logout", "https://www.example.com/logout"]
}, { dependsOn: [googleProvider] });

// Create a user pool domain
export const userPoolDomain = new aws.cognito.UserPoolDomain("cognito-domain", {
    domain: "my-test-domain",
    userPoolId: userPool.id,
}, { deleteBeforeReplace: true, dependsOn: [userPool] });

// IAM role for the Lambda function
const lambdaRole = new aws.iam.Role("lambdaRole", {
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

const lambdaCognitoPolicy = new aws.iam.Policy("lambdaCognitoPolicy", {
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
new aws.iam.RolePolicyAttachment("lambdaRolePolicyAttachment", {
    role: lambdaRole,
    policyArn: lambdaCognitoPolicy.arn,
}, { dependsOn: [lambdaCognitoPolicy, lambdaRole] });

// Grant the Cognito User Pool permission to invoke the Lambda function
new aws.lambda.Permission("cognitoPermission", {
    action: "lambda:InvokeFunction",
    function: checkEmailHandler,
    principal: "cognito-idp.amazonaws.com",
    sourceArn: userPool.arn
});

// // Create the Lambda function
// const emailCheckerLambda = new aws.lambda.Function("emailCheckerLambda", {
//     role: lambdaRole.arn,
//     handler: checkEmailExistsHandler.arn, // Update with the actual handler location
//     runtime: aws.lambda.Runtime.NodeJS18dX,
//     environment: {
//         variables: {
//             USER_POOL_ID: userPool.id
//         },
//     },
// });

// // Trigger the Lambda function upon a pre sign-up event in Cognito User Pool
// const userPoolTrigger = new aws.cognito.UserPool("myUserPool", {
//     lambdaConfig: {
//         preSignUp: emailCheckerLambda.arn
//     },
// }, { dependsOn: [emailCheckerLambda] }); // Ensure Lambda is created before assigning to Cognito trigger
