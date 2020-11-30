import { IResolvers } from 'graphql-tools';
import { gql } from "apollo-server-lambda";
import { PubSub } from "graphql-subscriptions";

import { ApolloServer } from "@fanoutio/apollo-server-lambda-grip";

// PubSub object from "graphql-subscriptions"
const pubSub = new PubSub();
const POST_ADDED = 'POST_ADDED';

// Create our schema...
const typeDefs = gql`
    type Query {
        hello: String
    }

    type Mutation {
        post(url: String!, description: String!): Link!
    }

    type Subscription {
        newLink: Link
    }

    type Link {
        id: ID!
        description: String!
        url: String!
    }
`;

// ...and our resolvers
const resolvers: IResolvers = {
    Query: {
        hello: () => 'Hello world!',
    },
    Mutation: {
        post(_parent, args) {
            const post = addPost(args.description, args.url);
            pubSub.publish(POST_ADDED, { newLink: post });
            return post;
        },
    },
    Subscription: {
        newLink: {
            subscribe: () =>  {
                return pubSub.asyncIterator([POST_ADDED]);
            },
        },
    },
};

// Back our data with an array for now (we'll move these into a DynamoDB soon)
const links = [];

let uniqueId = 0;
function addPost(description: string, url: string) {
    const id = `link-${uniqueId}`;
    uniqueId = uniqueId + 1;
    const link = {
        id,
        url,
        description,
    };
    links.push(link);
    return link;
}

// Instantiate apollo-server-lambda-grip
// Use the passed-in GRAPHQL_URL
const server = new ApolloServer({
    typeDefs,
    resolvers,
    subscriptions: {
        path: process.env.GRAPHQL_URL!,
    },
    playground: {
        endpoint: process.env.GRAPHQL_URL!,
    },
    introspection: true,
});

// And create the handler, specifying the GRIP url.
exports.handler = server.createHandler({
    grip: process.env.GRIP_URL!,
    persistence: {
        tableName: process.env.DYNAMODB_TABLE_NAME!,
        awsRegion: process.env.DYNAMODB_AWS_REGION!,
        awsAccessKeyId: process.env.DYNAMODB_AWS_ACCESS_KEY_ID!,
        awsSecretAccessKey: process.env.DYNAMODB_AWS_SECRET_ACCESS_KEY!,
    },
});
