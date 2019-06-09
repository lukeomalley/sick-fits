import { mount } from 'enzyme';
import wait from 'waait';
import toJSON from 'enzyme-to-json';
import { MockedProvider } from 'react-apollo/test-utils';
import Signup, { SIGNUP_MUTATION } from '../components/Signup';
import { fakeUser } from '../lib/testUtils';
import { CURRENT_USER_QUERY } from '../components/User';
import { ApolloConsumer } from 'react-apollo';

const me = fakeUser();

function type(wrapper, name, value) {
  wrapper.find(`input[name="${name}"]`).simulate('change', {
    target: { name, value },
  });
}

const mocks = [
  // Signup Mock Mutation
  {
    request: {
      query: SIGNUP_MUTATION,
      variables: {
        email: me.email,
        name: me.name,
        password: 'luke',
      },
    },
    result: {
      data: {
        signup: {
          __typename: 'User',
          id: 'fakeuser1',
          name: me.name,
          email: me.email,
        },
      },
    },
  },
  // Current User Mock
  {
    request: { query: CURRENT_USER_QUERY },
    result: {
      data: { me },
    },
  },
];

describe('<Signup />', () => {
  it('renders and matches snapshot', () => {
    const wrapper = mount(
      <MockedProvider>
        <Signup />
      </MockedProvider>,
    );
    expect(toJSON(wrapper.find('form'))).toMatchSnapshot();
  });

  // it('calls the mutation properly', async () => {
  //   let apolloClient;
  //   const wrapper = mount(
  //     <MockedProvider>
  //       <ApolloConsumer>
  //         {client => {
  //           apolloClient = client;
  //           return <Signup />;
  //         }}
  //       </ApolloConsumer>
  //     </MockedProvider>,
  //   );
  //   await wait();
  //   wrapper.update();
  //   type(wrapper, 'name', me.name);
  //   type(wrapper, 'email', me.email);
  //   type(wrapper, 'password', 'luke');
  //   wrapper.update();
  //   wrapper.find('form').simulate('submit');
  //   await wait();
  //   // Query the user out of the apollo client
  //   const user = await apolloClient.query({ query: CURRENT_USER_QUERY });
  //   console.log(user);
  // });
});
