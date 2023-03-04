const {
  ApolloServer,
  PubSub,
  AuthenticationError,
  SchemaDirectiveVisitor,
} = require('apollo-server');
const { defaultFieldResolver, GraphQLString } = require('graphql');
const gql = require('graphql-tag');

const pubSub = new PubSub();
const NEW_ITEM = 'NEW_ITEM';

class logDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const resolver = field.resolve || defaultFieldResolver;
    const { message } = this.args;
    field.args.push({
      type: GraphQLString,
      name: 'message',
    });
    field.resolve = (root, { message, ...rest }, ctx, info) => {
      const { message: schemaMessage } = this.args;
      console.log('hi', message || schemaMessage);
      return resolver.call(this, root, rest, ctx, info);
    };
  }
}

const typeDefs = gql`
  directive @log(message: String = "my message") on FIELD_DEFINITION

  type User {
    id: ID! @log(message: "id here")
    error: String! @deprecated
    username: String!
    createdAt: Int!
  }

  type Settings {
    user: User!
    theme: String!
  }

  type Item {
    task: String!
  }

  input NewSettingsInput {
    user: ID!
    theme: String!
  }

  type Query {
    me: User!
    settings(user: ID!): Settings
  }

  type Mutation {
    settings(input: NewSettingsInput!): Settings!
    createItem(task: String!): Item!
  }

  type Subscription {
    newItem: Item
  }
`;

const resolvers = {
  Query: {
    me() {
      return {
        id: 1234,
        username: 'jip',
        createdAt: 56565,
      };
    },
    settings(_, { user }) {
      return {
        user,
        theme: 'light',
      };
    },
  },
  Mutation: {
    settings(_, { input }) {
      return input;
    },
    createItem(_, { task }) {
      const item = { task };
      pubSub.publish(NEW_ITEM, { newItem: item });
      return item;
    },
  },
  Subscription: {
    newItem: {
      subscribe: () => pubSub.asyncIterator(NEW_ITEM),
    },
  },
  Settings: {
    user() {
      return {
        id: 1234,
        username: 'jip',
        createdAt: 56565,
      };
    },
  },
  User: {
    error() {
      throw new AuthenticationError('Not Auth');
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  schemaDirectives: {
    log: logDirective,
  },
  context({ connection }) {
    if (connection) {
      return { ...connection.context };
    }
  },
  subscriptions: {
    onConnect(params) {},
  },
});

server.listen().then(({ url }) => console.log(`server running at ${url}`));
