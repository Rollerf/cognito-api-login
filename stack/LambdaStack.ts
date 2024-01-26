import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { LambdaDefinition } from "./types";
import { Integration, Method } from "@pulumi/aws/apigateway";
import { Permission } from "@pulumi/aws/lambda";

export const createLambda = (definition: LambdaDefinition) => {
    // IAM role for Lambda use dynamodb
    const databaseRole = new aws.iam.Role(definition.handlerName + "-RoleForDatabase", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
    });

    // IAM policy attachment for Lambda
    const policy = new aws.iam.RolePolicyAttachment(definition.handlerName + "-PolicyForDatabase", {
        role: databaseRole,
        policyArn: definition.httpMethod == "GET" ? aws.iam.ManagedPolicy.AmazonDynamoDBReadOnlyAccess : aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess
    }, { dependsOn: [databaseRole] });

    // Create a Lambda function to respond to HTTP requests
    const handler = new aws.lambda.CallbackFunction(
        definition.handlerName, {
        runtime: aws.lambda.Runtime.NodeJS18dX,
        callback: definition.handler,
        timeout: definition.timeoutMins * 60,
        role: databaseRole,
        environment: {
            variables: {
                TABLE_NAME: definition.table.name,
            },
        },
    }, { dependsOn: [policy] });

    // Add permissions for the Lambda function to be called by API Gateway
    const lambdaPermission = new Permission(
        definition.handlerName + "-PermissionInvocationFromApi",
        {
            action: "lambda:InvokeFunction",
            principal: "apigateway.amazonaws.com",
            function: handler.arn,
            sourceArn: pulumi.interpolate`${definition.api.executionArn}/*/*`,
        }, { dependsOn: [handler, definition.api] });

    const method = new Method(
        definition.handlerName + "-Method",
        {
            restApi: definition.api.id,
            resourceId: definition.resource.id,
            httpMethod: definition.httpMethod,
            authorization: "COGNITO_USER_POOLS",
            authorizerId: definition.restAuthorizer.id,
            authorizationScopes: ["email", "openid"]
        }, { dependsOn: [definition.restAuthorizer] });

    //Create an integration for the API. The integration will call the Lambda function.
    const integration = new Integration(
        definition.handlerName + "-Integration",
        {
            restApi: definition.api.id,
            resourceId: method.resourceId,
            httpMethod: method.httpMethod,
            type: "AWS_PROXY",
            uri: handler.invokeArn,
            integrationHttpMethod: "POST",
        }, { dependsOn: [method] });

    // Create a CloudWatch Log Group associated with the Lambda function.
    const logGroup = new aws.cloudwatch.LogGroup(
        definition.handlerName + "-CloudWatchLogGroup",
        {
            name: pulumi.interpolate`/aws/lambda/${handler.name}`,
            retentionInDays: 30,
        },
        { dependsOn: [handler] });

    // Specify the Lambda function to attach the Log Group.
    new aws.lambda.Permission(definition.handlerName + "-CloudWatchLogGroup",
        {
            action: "lambda:InvokeFunction",
            function: handler,
            principal: "logs.amazonaws.com",
            sourceArn: logGroup.arn,
        }, { dependsOn: [logGroup] });

    return integration;
}
