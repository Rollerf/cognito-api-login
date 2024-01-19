import * as aws from "@pulumi/aws";
import { CognitoIdentityProvider, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { PreSignUpTriggerEvent } from "aws-lambda";
import * as pulumi from "@pulumi/pulumi";

// Create a Pulumi configuration object
const config = new pulumi.Config();

// Read the Lambda function name from the configuration
const lambdaFunctionName = "checkEmailExistsHandler-" + config.require("stageName");

export const checkEmailHandler = new aws.lambda.CallbackFunction(
  lambdaFunctionName, {
  runtime: aws.lambda.Runtime.NodeJS18dX,
  callback: async (event: PreSignUpTriggerEvent) => {
    try {
      // Create a new Cognito service object
      const cognitoIdentityProvider = new CognitoIdentityProvider();
      const params = {
        UserPoolId: event.userPoolId,
        AttributesToGet: ["email"],
        Limit: 1,
        Filter: `email = "${event.request.userAttributes.email}"`
      };

      const command = new ListUsersCommand(params);
      const response = await cognitoIdentityProvider.send(command);

      if (response.Users && response.Users.length > 0) {
        console.error("Users: " + JSON.stringify(response.Users));
        throw new Error("User already exists");
      }

      return event;

    } catch (error) {
      console.error(error);
      throw new Error("" + error);
    }
  }
});