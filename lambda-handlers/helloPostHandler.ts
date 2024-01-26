// Create a Lambda function to respond to HTTP requests
export const helloPostHandler = async (event: any) => {
    console.log(JSON.stringify(event));

    const aws = require('aws-sdk');
    const ddb = new aws.DynamoDB.DocumentClient();
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: event,
    };
    try {
        await ddb.put(params).promise();
        return { statusCode: 200 };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify(err) };
    }
}
