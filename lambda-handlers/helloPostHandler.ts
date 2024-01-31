import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Create a Lambda function to respond to HTTP requests
export const helloPostHandler = async (event: any) => {
    console.info(JSON.stringify(event));

    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);

    interface Item {
        user_id: string;
        utm_source: string;
        timeEpoch: number;
    }

    const putItem: Item = {
        user_id: event.requestContext.authorizer.claims.username,
        utm_source: event.queryStringParameters.utm_source,
        timeEpoch: event.queryStringParameters.epoch,
    };

    console.info("Time epoch is " + event.requestTimeEpoch);

    try {
        const command = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: putItem,
        });

        // Call DynamoDB to add the item to the table
        const response = await docClient.send(command);
        console.info("Response is " + JSON.stringify(response));

        return { statusCode: 200 };
    } catch (err) {
        console.error(err);

        return { statusCode: 500, body: JSON.stringify(err) };
    }
}
