import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Create a Lambda function to respond to HTTP requests
export const helloHandler = async (event: any) => {
    console.log(JSON.stringify(event));

    const client = new DynamoDBClient();
    const docClient = DynamoDBDocumentClient.from(client);

    const command = new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
            user_id: event.requestContext.authorizer.claims.username,
            utm_source: event.queryStringParameters.utm_source
        },
    });

    const response = await docClient.send(command);

    console.info("Response is " + JSON.stringify(response));

    return {
        statusCode: 200,
        body: JSON.stringify(response.Item),
    };
}
