const { Session } = require("@cef-ebsi/app-jwt");

const { API_NAME, privKey, trustedAppsRegistry } = require("./config");
const { UnauthorizedError } = require("./errors");

const session = new Session(API_NAME, privKey, trustedAppsRegistry);

/*
 * Get the token from the headers
 */
function getToken(req) {
  const token = req.get("authorization");
  if (token) return token.replace("Bearer ", "");
  return null;
}

/*
 * Handle token
 */
function handleToken(req, res, next) {
  const token = getToken(req);

  if (!token) {
    // No token in the headers
    next(new UnauthorizedError("No token present in the headers"));
    return;
  }

  try {
    session.verify(token);
  } catch (error) {
    next(error);
    return;
  }

  req.authenticated = true;
  next();
}

/*
 * Call new session
 */
async function callNewSession(req, res, next) {
  const { body } = req;
  try {
    const result = await session.newSession(body);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleToken,
  callNewSession,
};
