import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import { helloHandler } from "./helloHandler";

// Create a Cognito User Pool of authorized users
const userPool = new aws.cognito.UserPool("user-pool");
const userPoolClient = new aws.cognito.UserPoolClient("user-pool-client", {
    userPoolId: userPool.id,
    explicitAuthFlows: ["ADMIN_NO_SRP_AUTH"]
});

const api = new apigateway.RestAPI("api", {
    routes: [
        // Authorize requests using Cognito
        {
            path: "cognito-authorized",
            method: "GET",
            eventHandler: helloHandler,
            // Use Cognito as authorizer to validate the token from the Authorization header
            authorizers: [
                {
                    parameterName: "Authorization",
                    identitySource: ["method.request.header.Authorization"],
                    providerARNs: [userPool.arn],
                },
            ],
        }
    ],
});

export const url = api.url;
export const userPoolId = userPool.id;
export const userPoolClientId = userPoolClient.id;
export const cognitoUrl = userPoolClient.userPoolId.apply(id => `cognito-idp.${aws.config.region}.amazonaws.com/${id}`);
// export const swaggerUrl = swaggerAPI.url;
// export const apiKeyValue = apiKey.value;
