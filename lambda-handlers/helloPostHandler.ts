// Create a Lambda function to respond to HTTP requests
export const helloPostHandler = async (event: any) => {
    console.log(JSON.stringify(event));
    return {
        statusCode: 200,
        body: "Hello, Post Handler!",
    };
}
