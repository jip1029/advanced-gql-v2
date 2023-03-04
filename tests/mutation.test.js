const gql = require('graphql-tag');
const createTestServer = require('./helper');
const FEED = gql`
  {
    feed {
      id
      message
      createdAt
      likes
      views
    }
  }
`;
const CREATE_POST = gql`
  mutation {
    createPost(input: { message: "hello" }) {
      message
    }
  }
`;

describe('mutations', () => {
  test('create a post', async () => {
    const { mutate } = createTestServer({
      user: { id: 1 },
      models: {
        Post: {
          createOne() {
            return {
              message: 'hello',
            };
          },
        },
      },
    });

    const res = await mutate({ query: CREATE_POST });
    expect(res).toMatchSnapshot();
  });
});
