import { Authorizer, Resource, RestApi } from "@pulumi/aws/apigateway";
import { Runtime } from "@pulumi/aws/lambda";
import { LambdaDefinition } from "./types";
import { helloHandler } from "../lambda-handlers/helloHandler";
import { helloPostHandler } from "../lambda-handlers/helloPostHandler";
import * as pulumi from "@pulumi/pulumi";
import {table} from "./DynamoDbStack";

const config = new pulumi.Config();

export const getLambdaDefinitions =
    (api: RestApi, restAuthorizer: Authorizer, resource: Resource)
        : LambdaDefinition[] => {
        return [
            {
                handlerName: "helloHandler-" + config.require("stageName"),
                handler: helloHandler,
                runtime: Runtime.NodeJS18dX,
                api: api,
                resource: resource,
                httpMethod: "GET",
                restAuthorizer: restAuthorizer,
                timeoutMins: 1,
                table: table
            },
            {
                handlerName: "helloPostHandler-" + config.require("stageName"),
                handler: helloPostHandler,
                runtime: Runtime.NodeJS18dX,
                api: api,
                resource: resource,
                httpMethod: "POST",
                restAuthorizer: restAuthorizer,
                timeoutMins: 1,
                table: table
            }
        ]
    }