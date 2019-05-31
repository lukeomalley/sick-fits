const { forwardTo } = require('prisma-binding');

const Query = {
  items: forwardTo('db'),
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  me(parent, args, ctx, info) {
    // Check if there is a current userID
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user(
      {
        where: { id: ctx.request.userId },
      },
      info,
    );
  },
  //   async items(parent, args, ctx, info) {
  //     console.log("Getting Items");
  //     const items = await ctx.db.query.items();
  //     return items;
  //   }

  //   dogs(parent, args, context, info) {
  //     global.dogs = global.dogs || [];
  //     return global.dogs;
  //   },
};

module.exports = Query;
