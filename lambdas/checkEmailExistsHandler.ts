import * as aws from "@pulumi/aws";
import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";

export const checkEmailHandler = new aws.lambda.CallbackFunction("check-email-handler", {
  callback: async (event, context) => {
    console.log(JSON.stringify(event));

    try {
      // Create a new Cognito service object
      const cognitoIdServiceProvider = new CognitoIdentityProvider();
      const params = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: JSON.parse((event as any).body).email,
      };

      const users = await cognitoIdServiceProvider.listUsers(params);

      if (users.Users && users.Users.length > 1) {
        return event;
      }

      throw new Error("User already exists");
    } catch (error) {
      console.error(error);
      throw new Error("Error " + error);
    }
  }
});