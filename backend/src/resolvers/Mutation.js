const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');

const { hasPermission } = require('../utils');
const { transport, makeANiceEmail } = require('../mail');
const stripe = require('../stripe');

const Mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that');
    }
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          // This is how we create a relationship between an item and the user
          user: {
            connect: {
              id: ctx.request.userId,
            },
          },
          ...args,
        },
      },
      info,
    );
    return item;
  },

  updateItem(parent, args, ctx, info) {
    // Take a copy of the updates
    const updates = { ...args };
    // Remove the ID from the updates
    delete updates.id;
    // run the update method
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id,
        },
      },
      info,
    );
  },

  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    // Find the item
    const item = await ctx.db.query.item({ where }, `{id title user{ id }}`);
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPerissions = ctx.request.user.permissions.some(permission => {
      ['ADMIN', 'ITEMDELETE'].includes(permission);
    });

    if (!ownsItem && !hasPerissions) {
      throw new Error('You do not have permission to delete this item');
    }
    // Delete it
    return ctx.db.mutation.deleteItem({ where }, info);
  },

  async signup(parent, args, ctx, info) {
    // Lowercase the users email
    args.email = args.email.toLowerCase();
    // Hash their password
    const password = await bcrypt.hash(args.password, 10);
    // Create the user in the database
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ['USER'] },
        },
      },
      info,
    );

    // Create the JWT token for the user
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

    // Set the jwt as a cookie on the response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // one year cookie
    });

    // We return the user to the browser
    return user;
  },

  async signin(partnet, { email, password }, ctx, info) {
    // Check if there is a user with that email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No user found for email ${email}`);
    }

    // Check if that password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Invalid Password');
    }

    // Generate the JWT Token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

    // Set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    // Return the user
    return user;
  },

  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Goodbye!' };
  },

  async requestReset(parent, args, ctx, info) {
    // Check if this is a real user
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) {
      throw new Error(`No user with the email ${args.email}`);
    }
    // Set a reset token and expiry on that user
    const randomBytesPromisified = promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry },
    });
    // Email them that reset token
    const mailRes = await transport.sendMail({
      from: 'Luke@luke.com',
      to: user.email,
      subject: 'Your password reset token',
      html: makeANiceEmail(
        `Your password reset token is here! \n\n <a href="${
          process.env.FRONTEND_URL
        }/reset?resetToken=${resetToken}">Click Here to Reset!</a>`,
      ),
    });

    // Return the message
    return { message: 'Thanks!' };
  },

  async resetPassword(parent, args, ctx, info) {
    // Check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    // Check if its a legit reset token
    // Check it its expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000,
      },
    });
    if (!user) {
      throw new Error('This token is either invalid or expired');
    }
    // Hash the new password
    const password = await bcrypt.hash(args.password, 10);
    // Save the new password to the user and remove old reset token fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: { password, resetToken: null, resetTokenExpiry: null },
    });
    // Generate jwt
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    // Set the jwt cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
    // Return the new user
    return updatedUser;
  },

  async updatePermissions(parent, args, ctx, info) {
    // Check if they are logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!');
    }
    // Query the current user
    const currentUser = await ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId,
        },
      },
      info,
    );
    // Check if they have permissions to do this
    hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);
    // Update the permissions
    return ctx.db.mutation.updateUser(
      {
        data: {
          permissions: {
            set: args.permissions,
          },
        },
        where: {
          id: args.userId,
        },
      },
      info,
    );
  },

  async addToCart(parent, args, ctx, info) {
    // Make sure that they are signed in
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error('You must be signed in to add items to your cart');
    }
    // Query the users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id },
      },
    });
    // Check if that item is already in the cart increment by 1 if it is
    if (existingCartItem) {
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 },
        },
        info,
      );
    }
    // If it is not, create a new cart item for that user
    return ctx.db.mutation.createCartItem(
      {
        data: {
          user: {
            connect: { id: userId },
          },
          item: {
            connect: { id: args.id },
          },
        },
      },
      info,
    );
  },

  async removeFromCart(parent, args, ctx, info) {
    // Find the cart item
    const cartItem = await ctx.db.query.cartItem(
      {
        where: { id: args.id },
      },
      `{ id, user { id } }`,
    );

    // Make sure that we found an item
    if (!cartItem) throw new Error('No cart item found');

    // Make sure they own that item
    if (cartItem.user.id !== ctx.request.userId) throw new Error('Cheater');

    // Delete that cart item
    return ctx.db.mutation.deleteCartItem(
      {
        where: { id: args.id },
      },
      info,
    );
  },

  async createOrder(parent, args, ctx, info) {
    // Query the user and make sure they are signed in
    const { userId } = ctx.request;
    if (!userId)
      throw new Error('You must be signed in to complete this order');
    const user = await ctx.db.query.user(
      { where: { id: userId } },
      `{
          id 
          name 
          email 
          cart { 
            id 
            quantity 
            item { 
              title 
              price 
              id 
              description 
              image
              largeImage
            }
          }}`,
    );
    // Recalculate the total for the price
    const amount = user.cart.reduce(
      (tally, cartItem) => tally + cartItem.item.price * cartItem.quantity,
      0,
    );
    console.log(`Going to charge for a total of: ${amount}`);
    // Create the stripe charge (turn token into money)
    const charge = await stripe.charges.create({
      amount,
      currency: 'USD',
      source: args.token,
    });
    // Convert the CartItems to OrderItems
    const orderItems = user.cart.map(cartItem => {
      const orderItem = {
        ...cartItem.item,
        quantity: cartItem.quantity,
        user: { connect: { id: userId } },
      };
      delete orderItem.id;
      return orderItem;
    });
    // Create the Order
    const order = await ctx.db.mutation.createOrder({
      data: {
        total: charge.amount,
        charge: charge.id,
        items: { create: orderItems },
        user: { connect: { id: userId } },
      },
    });
    // Clean Up the users cart and delete cartItems
    const cartItemIds = user.cart.map(cartItem => cartItem.id);
    await ctx.db.mutation.deleteManyCartItems({
      where: { id_in: cartItemIds },
    });
    // Return order to the client
    return order;
  },
};

module.exports = Mutations;
