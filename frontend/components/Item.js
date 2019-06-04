import React, { Component } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Title from './styles/Title';
import ItemStyles from './styles/ItemStyles';
import PriceTag from './styles/PriceTag';
import DeleteItem from './DeleteItem';
import AddToCart from './AddToCart';
import formatMoney from '../lib/formatMoney';

const A = styled.a`
  border: 0;
  cursor: pointer;
  &:focus {
    outline: none;
  }
  &:active {
    transform: translateY(1px);
  }
`;

class Item extends Component {
  render() {
    const { item } = this.props;
    return (
      <ItemStyles>
        {item.image && <img src={item.image} alt={item.title} />}
        {/* {item.image ? <img src={item.image} alt={item.title}/>: null } */}
        <Title>
          <Link
            href={{
              pathname: '/item',
              query: { id: item.id },
            }}
          >
            <a>{item.title}</a>
          </Link>
        </Title>
        <PriceTag>{formatMoney(item.price)}</PriceTag>
        <p>{item.description}</p>
        <div className="buttonList">
          <Link
            href={{
              pathname: '/update',
              query: { id: item.id },
            }}
          >
            <A>Edit</A>
          </Link>
          <AddToCart id={item.id} />
          <DeleteItem id={item.id}>Delete Item</DeleteItem>
        </div>
      </ItemStyles>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

export default Item;
