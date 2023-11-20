# Routes in API Gateway

This example create an API Gateway which responds to requests using Lambda Function.

When you're finished, you'll be familiar with how to configure routes in API Gateway using the RestAPI.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploy the App

### Step 1: Create a directory and cd into it

For Pulumi examples, we typically start by creating a directory and changing into it. Then, we create a new Pulumi project from a template. For example, `azure-javascript`.

1. Install prerequisites:

    ```bash
    npm install
    ```

2. Create a new Pulumi stack:

    ```bash
    pulumi stack init
    ```

3. Configure the AWS region to deploy into:

    ```bash
    pulumi config set aws:region eu-west-3
    ```

4. Deploy the Pulumi stack:

    ```bash
    pulumi up
    ```

### Step 2: Test your API
1. Create a random password

    ```bash
    PASSWORD=$(aws secretsmanager get-random-password --require-each-included-type --password-length 10 | jq -r .RandomPassword)
    ```

2. Create a user

    ```bash
    aws cognito-idp sign-up --region $(pulumi config get aws:region) --client-id $(pulumi stack output userPoolClientId) --username "test@domain.example" --password "$PASSWORD"
    ```

3. Confirm the user's account

    ```bash
    aws cognito-idp admin-confirm-sign-up --region $(pulumi config get aws:region) --user-pool-id $(pulumi stack output userPoolId) --username "test@domain.example"
    ```

4. Authenticate to create a new session:

    ```bash
    TOKEN=$(aws cognito-idp admin-initiate-auth --region $(pulumi config get aws:region) --user-pool-id $(pulumi stack output userPoolId) --client-id $(pulumi stack output userPoolClientId) --auth-flow ADMIN_NO_SRP_AUTH --auth-parameters "{\"USERNAME\":\"test@domain.example\",\"PASSWORD\":\"$PASSWORD\"}")
    ```

5. Perform authenticated request

    ```bash
    $ curl -w '\n' -H "Authorization: $(echo $TOKEN | jq '.AuthenticationResult.IdToken' -r)" "$(pulumi stack output url)cognito-authorized"
    Hello, API Gateway!
    ```

Fetch and review the logs from the Lambda executions:

```bash
pulumi logs
```

## Clean Up

Once you're finished experimenting, you can destroy your stack and remove it to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

In this tutorial, you deployed an API with different route configurations. Now you can use these patterns to build real APIs which connect to other services.

## References

- Completed tutorial could be found [here](https://www.pulumi.com/registry/packages/aws-apigateway/how-to-guides/aws-apigateway-ts-routes/)