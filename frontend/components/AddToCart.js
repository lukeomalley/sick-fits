import React from 'react';
import { Mutation } from 'react-apollo';
import gql from 'graphql-tag';
import { CURRENT_USER_QUERY } from './User';
import styled from 'styled-components';

const ADD_TO_CART_MUTATION = gql`
  mutation addToCart($id: ID!) {
    addToCart(id: $id) {
      id
      quantity
    }
  }
`;

const CartButton = styled.button`
  font-weight: bold;
  border: 0;
  &:focus {
    outline: none;
  }
  &:active {
    transform: translateY(1px);
  }
`;

// TODO: Add optomistic response for the add to cart button

class AddToCart extends React.Component {
  render() {
    const { id } = this.props;
    return (
      <Mutation
        mutation={ADD_TO_CART_MUTATION}
        variables={{ id }}
        refetchQueries={[{ query: CURRENT_USER_QUERY }]}
      >
        {(addToCart, { loading }) => (
          <CartButton disabled={loading} onClick={addToCart}>
            Add{loading ? 'ing' : ''} to Cart 🛒
          </CartButton>
        )}
      </Mutation>
    );
  }
}

export default AddToCart;
