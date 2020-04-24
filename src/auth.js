const axios = require("axios");
const jose = require("jose");
const debug = require("debug");

const config = require("./config");
const logger = require("./logger");
const {
  BadRequestError,
  InvalidTokenError,
  IssuerNotFoundError,
  InvalidAppError,
  UnauthorizedError,
} = require("./errors");

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";

/*
 * Generate a new token for the client
 */
function generateToken() {
  const payload = {
    iss: config.API_NAME,
    aud: config.API_NAME,
  };
  const token = jose.JWT.sign(payload, config.jwt.privKey, {
    expiresIn: "15 minutes",
  });

  return {
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: 900, // 15 minutes
    issuedAt: Date.now(),
  };
}

/*
 * Trusted Apps Registry Validation
 * - Verify that {appName} is a trusted app
 * - Verify the signature using the public key in the registry
 * - Verify that {appName} is authorized to use the API
 */
async function trustedAppsRegistryValidation(appName, token) {
  let url = `${config.trustedAppsRegistry}/apps/${appName}`;
  let response;
  try {
    logger.info(`Accesing ${url}`);
    response = await axios.get(url);
  } catch (error) {
    if (error.response.status >= 500)
      error.response.data = `Trusted Apps Registry: ${error.response.data}`;
    throw new IssuerNotFoundError(error.response.data);
  }

  if (!response.data.pubKey) {
    throw new IssuerNotFoundError(
      `'${appName}' not found in the list of trusted apps`
    );
  }

  const base64pubkey = response.data.pubKey;
  const publicKeyPEM = Buffer.from(base64pubkey, "base64").toString("utf8");

  try {
    jose.JWT.verify(token, publicKeyPEM);
  } catch (error) {
    throw new InvalidTokenError(error.message);
  }

  url = `${config.trustedAppsRegistry}/apps/${config.API_NAME}/authorized-apps/${appName}`;
  try {
    logger.info(`Accesing ${url}`);
    await axios.get(url);
  } catch (error) {
    if (error.response.status >= 500)
      error.response.data = `Trusted Apps Registry: ${error.response.data}`;
    throw new InvalidAppError(error.response.data);
  }
}

/*
 * Create a new session
 *
 * This function validates a self signed token issued by the user,
 * checks the trusted apps registry and generates a session token.
 */
async function newSession(body) {
  if (body.grantType !== GRANT_TYPE)
    throw new BadRequestError(`grantType must be '${GRANT_TYPE}'`);

  if (!body.assertion)
    throw new BadRequestError("No assertion present in the body");

  const token = body.assertion;
  if (!token) {
    throw new InvalidTokenError("No token present in the headers");
  }

  const payload = jose.JWT.decode(token);
  if (!payload.aud || !payload.iss || !payload.iat || !payload.exp) {
    throw new InvalidTokenError(
      "The token requires iss, aud, iat, and exp in the payload"
    );
  }

  // verify audience
  if (payload.aud !== config.API_NAME) {
    throw new InvalidTokenError(
      `The aud in the token must be ${config.API_NAME}`
    );
  }

  // validate token in the trusted app registry
  if (!process.env.EBSI_TEST_MODE) {
    const appName = payload.iss;
    await trustedAppsRegistryValidation(appName, token);
  }
  const sessionToken = generateToken();
  return sessionToken;
}

/*
 * Functions for the Router
 */

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
    debug("token")("No token present in the headers");
    next(new UnauthorizedError("No token present in the headers"));
    return;
  }

  let payload;
  try {
    payload = jose.JWT.verify(token, config.jwt.privKey);
  } catch (error) {
    next(new InvalidTokenError(error.message));
    return;
  }

  if (payload.aud !== config.API_NAME) {
    next(
      new InvalidTokenError(
        `Token with incorrect audience. Please create a new session with '${config.API_NAME}'`
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
    const result = await newSession(body);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  newSession,
  handleToken,
  callNewSession,
};
