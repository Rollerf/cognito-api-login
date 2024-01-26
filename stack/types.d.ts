import { Authorizer, Resource } from "@pulumi/aws/apigateway";
import { RestApi } from "@pulumi/aws/apigateway/restApi";
import { Table } from "@pulumi/aws/dynamodb";
import { Runtime } from "@pulumi/aws/lambda";
import { Callback } from "aws-lambda";

export type LambdaDefinition = {
  handlerName: string;
  handler: Callback<any>;
  runtime: Runtime;
  timeoutMins: number;
  api: RestApi;
  resource: Resource;
  restAuthorizer: Authorizer;
  httpMethod: string;
  table: Table;
};