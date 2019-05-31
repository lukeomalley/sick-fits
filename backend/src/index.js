const cookieParser = require('cookie-parser');
require('dotenv').config({ path: 'variables.env' });
const jwt = require('jsonwebtoken');
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// Express middleare to handle cookies(JWT)
server.express.use(cookieParser());

// Decode the JWT so that we can get the user ID on each request
server.express.use((req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    const { userId } = jwt.verify(token, process.env.APP_SECRET);
    // Put the userID on to the request
    req.userId = userId;
  }
  next();
});

//TODO Use express middleware to populate current user

server.start(
  {
    cors: {
      credentials: true,
      origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
    },
  },
  deets => {
    console.log(`Server is now running on http://localhost:${deets.port}`);
  },
);
