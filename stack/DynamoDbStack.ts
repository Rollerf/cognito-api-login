import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Get config
const config = new pulumi.Config();

// Create a DynamoDB table
export const table = new aws.dynamodb.Table("cognito-api-login-db", {
    name: "cognito-api-login-db",
    attributes: [
        { name: "user_id", type: "S" },
        { name: "utm_source", type: "S" },
    ],
    hashKey: "id",
    rangeKey: "utm_source",
    billingMode: "PAY_PER_REQUEST"
});