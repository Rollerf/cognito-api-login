// Copyright 2016-2021, Pulumi Corporation.

import * as aws from "@pulumi/aws";

// Create a Lambda function to respond to HTTP requests
export const helloHandler = new aws.lambda.CallbackFunction("hello-handler", {
    runtime: aws.lambda.Runtime.NodeJS18dX,
    callback: async (event) => {
        console.log(JSON.stringify(event));
        return {
            statusCode: 200,
            body: "Hello, API Gateway!",
        };
    },
});
