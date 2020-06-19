const jose = require("jose");
const debug = require("debug");
const { Session } = require("@cef-ebsi/app-jwt").default;

const { API_NAME, privKey, trustedAppsRegistry } = require("./config");
const { InvalidTokenError } = require("./errors");

const session = new Session(API_NAME, privKey, trustedAppsRegistry);

/*
 * Get the token from the headers
 */
function getToken(req) {
  debug("headers")(req.headers);
  const token = req.headers.authorization;
  debug("token")(token);
  if (token) return token.replace("Bearer ", "");
  return null;
}

/*
 * Handle token
 */
function handleToken(req, res, next) {
  const token = getToken(req);

  if (!token) {
    // No token in the headers. Continue the call as unauthenticated user
    debug("token")("Token not present in the headers");
    req.authenticated = false;
    next();
    return;
  }

  let payload;
  try {
    payload = jose.JWT.verify(token, privKey);
  } catch (error) {
    next(new InvalidTokenError(error.message));
    return;
  }

  if (payload.aud !== API_NAME) {
    next(
      new InvalidTokenError(
        `Token with incorrect audience. Please create a new session with '${API_NAME}'`
      )
    );
    return;
  }

  debug("token")("Valid token");
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
