import React from 'react';
import { Mutation } from 'react-apollo';
import gql from 'graphql-tag';
import { CURRENT_USER_QUERY } from './User';

const SIGNOUT_MUTATION = gql`
  mutation SIGN_OUT {
    signout {
      message
    }
  }
`;

const Signout = props => (
  <Mutation
    mutation={SIGNOUT_MUTATION}
    refetchQueries={[{ query: CURRENT_USER_QUERY }]}
  >
    {signout => <button onClick={signout}>Sign Out</button>}
  </Mutation>
);

export default Signout;
