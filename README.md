# apollo-server-lambda-demo

This package is a demo that shows the usage of the @fanoutio/apollo-server-lambda-grip package for creating a GraphQL
server based on Apollo Server that runs on AWS Lambda while supporting subscriptions over the Websocket-over-HTTP protocol,
using GRIP to publish the subscription messages.

This demo uses SAM for development and publishing of the lambda function.

It can be run locally using `sam local start-api` along with Pushpin (https://pushpin.org/).
You can deploy it to AWS Lambda by deploying it using `sam deploy` along with Fanout Cloud (https://fanout.io/cloud/).

### Running Locally

#### Prerequisites

1. Install SAM and Docker by [following the steps here](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).

2. Install Pushpin by [following the steps here](https://pushpin.org/docs/install/).

3. Configure Pushpin by modifying the [routes file](https://pushpin.org/docs/configuration/#routes).  You will want to
make sure you have the following route in this file.
    ```
    * localhost:3000,over_http
    ```

4. Obtain `aws-sam-api-proxy`.  You will want this for a few reasons, the main one being that at the current moment AWS
SAM's local API is very slow to serve each request as it must restart the container on every invoke.  The GraphQL Playground
packaged with `apollo-server` has a very short timeout on subscription requests (1000ms) and there is currently no way to
adjust that timeout, so until either of these is fixed, we can use `aws-sam-api-proxy` as a container that will stay warm
between requests.
    ```
    npm i aws-sam-api-proxy -g
    ```

5. Build the project.  
    ```
    npm i
    npm run build
    ```

    This will cause artifacts to be built in the `.aws-sam` directory.

6. Start Pushpin
    ```
    pushpin
    ```

7. Start the API.

    In a new terminal window,
    ```
    cd .aws-sam/build
    sam-proxy start apollo-server-lambda-demo -p 3000 --ref-overrides GraphqlUrl=/graphql,GripUrl=http://host.docker.internal:5561/
    ```

#### Testing the API

1. Access the GraphQL Playground

    In a browser window, open http://localhost:7999/graphql

2. Test a subscription

    1. Type the following into a query window and then click the PLAY button in the center of the screen. 
        ```
        subscription {
          newLink {
            url
            description
          }
        }
        ```

   2. Create a new tab, and then type the following into the new query window.
        ```
        mutation {
          post(url: "www.google.com", description: "Google") {
            id
            url
            description
          }
        }
        ```

   3. Click the PLAY button in the center of the screen.  You should see the following appear in the results window on the
        right side.
        ```
        {
          "data": {
            "post": {
              "id": "link-0",
              "url": "www.google.com",
              "description": "Google"
            }
          }
        }
        ```

   4. Click back to the tab where you typed the subscription command. 

        You should now see the following in the results window.
        ```
        {
          "data": {
            "newLink": {
              "url": "www.google.com",
              "description": "Google"
            }
          }
        }
        ```

3. Test container restart. 

    1. This should work even if the lambda container is shut down.

        In the terminal window where you are running the API, press
        Ctrl-C to close the process, and then restart it using the same command as Step 3 above.

    2. In the GraphQL playground, create a new tab, and then type the following into the new query window.
        ```
        mutation {
          post(url: "www.amazon.com", description: "Amazon") {
            id
            url
            description
          }
        }
        ```

   3. Click the PLAY button in the center of the screen.  You should see the following appear in the results window on the
        right side.
        ```
        {
          "data": {
            "post": {
              "id": "link-0",
              "url": "www.amazon.com",
              "description": "Amazon"
            }
          }
        }
        ```

   4. Click back to the tab where you typed the subscription command. 

        You should now see the following in the results window.
        ```
        {
          "data": {
            "newLink": {
              "url": "www.amazon.com",
              "description": "Amazon"
            }
          }
        }
        ```

#### Cleaning up

When you are done, you can clean up by following these steps:

1. Stop the API. In the terminal window where you are running the API, press Ctrl-C to close the process.

2. Type the following to remove the container built for the API.
    ```
    sam-proxy teardown apollo-server-lambda-demo
    ```

3. Switch to the parent directory
    ```
    cd ../..
    ```

4. Remove the built artifacts
    ```
    npm run clean
    ```

### Running on AWS Lambda

#### Prerequisites

1. If you don't already have an AWS account, visit https://aws.amazon.com/ and choose "Create an AWS Account".

    For detailed instructions on this step, see [Create and Activate an AWS Account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)
    on AWS's website.  Although AWS Lambda has a free tier, and under most circumstances a simple demo
    such as this one will likely fall under that tier, note that using AWS may incur costs.
  
2. Install SAM by [following the steps here](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).

    You do not need to install Docker if you will only be running on AWS Lambda.

3. Obtain an account with [Fanout Cloud](https://fanout.io/cloud/).

    The free Hacker plan can be used for this demo.

4. Configure your account in Fanout Cloud.

    1. In the Control Panel, click the "+ Add Realm" button.

    2. You will be asked to give the realm a name.  Give it a suitable name such as `apollo-server-lambda-demo`. Click "Add Realm".

    3. You will be taken to the Realm's Control Panel. Make a note of the `GRIP_URL` that is displayed for this Realm.
    
        It will look something like `https://api.fanout.io/realm/abcd0123?iss=abcd0123&key=base64:01234567abcdefghIJKLMN%3D%3D`.

    4. We will come back to configure your proxy after we have deployed the application to AWS Lambda.

5. Build the project.
    ```
    npm i
    npm run build
    ```

    This will cause artifacts to be built in the `.aws-sam` directory.

6. Perform an initial deploy to AWS Lambda.

    1. Type the following.
        ```
        sam deploy --guided
        ```

    2. You will be asked a series of questions.  Sample answers are given below.

        For the Parameter `GripUrl`, enter the `GRIP_URL` you noted in step 4d above.
        ```
        Configuring SAM deploy
        ======================
        
                Looking for config file [samconfig.toml] :  Not found
        
                Setting default arguments for 'sam deploy'
                =========================================
                Stack Name [sam-app]: apollo-server-lambda-demo
                AWS Region [us-east-1]: 
                Parameter GraphqlUrl [/Prod/graphql]: 
                Parameter GripUrl []: https://api.fanout.io/realm/abcd0123?iss=abcd0123&key=base64:01234567abcdefghIJKLMN%3D%3D
                #Shows you resources changes to be deployed and require a 'Y' to initiate deploy
                Confirm changes before deploy [y/N]: 
                #SAM needs permission to be able to create roles to connect to the resources in your template
                Allow SAM CLI IAM role creation [Y/n]: 
                ApolloServerLambdaDemoFunction may not have authorization defined, Is this okay? [y/N]: y
                Save arguments to configuration file [Y/n]: 
                SAM configuration file [samconfig.toml]: 
                SAM configuration environment [default]: 
        
                Looking for resources needed for deployment: Found!
        
                        Managed S3 bucket: aws-sam-cli-managed-default-samclisourcebucket-abcdef012345
                        A different default S3 bucket can be set in samconfig.toml
        
                Saved arguments to config file
                Running 'sam deploy' for future deployments will use the parameters saved above.
                The above parameters can be changed by modifying samconfig.toml
        ```  
        Once you have entered the above information, your data will be saved to a `samconfig.toml` file.

    3. You will be presented with progress and updates as the stack is created and deployed.
        
        When this is complete, you will see a list of outputs, among which is the API Gateway endpoint
        URL.  Make a note of this.  The following is an example:
        ```
        Key                 ApolloServerLambdaDemoApi                                                                                                                                                                       
        Description         API Gateway endpoint URL for Prod stage for Apollo Server lambda demo function                                                                                                                  
        Value               https://abcdefgh01.execute-api.us-east-1.amazonaws.com/Prod/graphql/
        ```

    4. Your endpoint is ready.
        It should now be possible to access it in a browser using this API
        URL.  However, subscriptions will not work at this point as those will
        require the GRIP proxy.

7. Configure the Fanout Cloud domain.

    1. Return to Fanout Cloud [Control Panel](https://fanout.io/account/panel/) and make sure that your
        realm is selected.
        
        If it is not, click the dropdown menu next to Realm and then select the realm
        that you have created in step 4 for this demo.

    2. In the lower section of the page labeled _Domains for <realm-name>_, you will see the one built-in domain name.

        Make a note of this domain name (it will look something like `0123abcd.fanoutcdn.com`), as you will
        need it to access your application.

    3. Click the "Edit" button under Actions in this row.  You will be taken to a screen titled _Edit Domain_.

    4. In the text box labeled _Origin Server SSL_, enter the host name of the API Gateway endpoint
        you obtained at the end of step 6, followed by `:443`. For example, in the case of the example above you would
        enter
        ```
        abcdefgh01.execute-api.us-east-1.amazonaws.com:443
        ```

    5. Ensure that the checkbox next to _Origin Server Uses WebSocket-Over-HTTP Protocol_ is checked.

    6. Click "Save Changes".

#### Testing the API

1. Access the GraphQL Playground

In a browser window, open the application behind Fanout Cloud.  Use the domain name you abtained
in step 7b.  For example, in the example above you would access `http://0123abcd.fanoutcdn.com/Prod/graphql`.

2. Test a subscription

    1. Type the following into a query window and then click the PLAY button in the center of the screen. 
        ```
        subscription {
          newLink {
            url
            description
          }
        }
        ```

    2. Create a new tab, and then type the following into the new query window.
        ```
        mutation {
          post(url: "www.google.com", description: "Google") {
            id
            url
            description
          }
        }
        ```

    3. Click the PLAY button in the center of the screen.  You should see the following appear in the results window on the
        right side.
        ```
        {
          "data": {
            "post": {
              "id": "link-0",
              "url": "www.google.com",
              "description": "Google"
            }
          }
        }
        ```

   4. Click back to the tab where you typed the subscription command. 

        You should now see the following in the results window.
        ```
        {
          "data": {
            "newLink": {
              "url": "www.google.com",
              "description": "Google"
            }
          }
        }
        ```

3. Test container restart. 

    1. This should work even if the lambda container is shut down.  You can test this by forcing a container
        restart by forcing an upload of the artifact.
        ```
        sam deploy --force-upload
        ```

    2. In the GraphQL playground, create a new tab, and then type the following into the new query window.
        ```
        mutation {
          post(url: "www.amazon.com", description: "Amazon") {
            id
            url
            description
          }
        }
        ```

   3. Click the PLAY button in the center of the screen.  You should see the following appear in the results window on the
        right side.
        ```
        {
          "data": {
            "post": {
              "id": "link-0",
              "url": "www.amazon.com",
              "description": "Amazon"
            }
          }
        }
        ```

   4. Click back to the tab where you typed the subscription command. 
        
        You should now see the following in the results window.
        ```
        {
          "data": {
            "newLink": {
              "url": "www.amazon.com",
              "description": "Amazon"
            }
          }
        }
        ```

#### Cleaning up

1. To clean up the stack in AWS Lambda, follow these steps:

    1. Visit the AWS Lambda console at https://console.aws.amazon.com/lambda/home

    2. Make sure you are viewing the region that you deployed the application to, by using the Region selector at the top right
        of the screen.

    3. In the sidebar, choose Applications.

    4. Find the application that you deployed above, and click the radio button next to its name.  In the Actions dropdown button
        at the top, click "Delete". 

    5. You will be presented with a popup box that contains a message saying to use CloudFormation to delete this stack,
        where the words _application stack_ is a link to the CloudFormation stack associated with this application. Click it.

    6. You will be taken to the CloudFormation stack details page. At the top right of the page, click the "Delete" button.
        You will be presented with a popup box asking for confirmation.  Click "Delete stack".

2. Remove the built artifacts
    ```
    npm run clean
    ```

### Reference

1. For information on GraphQL, see https://graphql.org
2. For information on Apollo Server, see https://www.apollographql.com/docs/apollo-server/
3. For information on AWS Lambda, see https://aws.amazon.com/lambda/
4. For information on Websocket-over-HTTP, see https://pushpin.org/docs/protocols/websocket-over-http/
5. For information on GRIP https://pushpin.org/docs/protocols/grip/
