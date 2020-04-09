var axios = require("axios");
var jose = require("jose");
const debug = require("debug");

var config = require("./config");

function generateToken(appName) {
  var payload = {
    iss: appName,
    aud: appName
  };
  var token = jose.JWT.sign(payload, config.jwt[appName].privKey, {
    expiresIn: "15 minutes"
  });
  return token;
}

function getToken(req) {
  debug("headers")(req.headers);
  var token = req.headers["authorization"];
  debug("token")(token);
  if (token) return token.replace("Bearer ", "");
  return null;
}

function login(me) {
  return async function(req, res) {
    var token = getToken(req);

    if (!token) {
      res.status(400).send("Invalid token");
      return;
    }

    var payload = jose.JWT.decode(token);
    if (!payload.aud || !payload.iss || !payload.iat || !payload.exp) {
      res
        .status(400)
        .send("The token requires iss, aud, iat, and exp in the payload");
      return;
    }

    // verify if it was created recently (max 15 min)
    if (payload.iat * 1000 < Date.now() - 15 * 60 * 1000) {
      res.status(400).send("The token is not recent (max 15 min old)");
      return;
    }

    // verify expiration
    if (payload.exp * 1000 < Date.now()) {
      res.status(400).send("Token expired");
      return;
    }

    // verify audience
    if (payload.aud !== me) {
      res.status(400).send(`The aud in the token must be ${me}`);
    }

    var url = config.ebsitrustedapp + "/public-keys/" + payload.iss;
    var response;

    try {
      console.log(url);
      response = await axios.get(url);
    } catch (error) {
      res.status(error.response.status).send(error.response.data);
      return;
    }

    if (!response.data.pubKey) {
      res
        .status(404)
        .send(`'${payload.iss}' not found in the list of trusted apps`);
      return;
    }

    var base64pubkey = response.data.pubKey;
    var public_key_PEM = Buffer.from(base64pubkey, "base64").toString("utf8");

    try {
      jose.JWT.verify(token, public_key_PEM);
    } catch (error) {
      res.status(400).send(error.message);
      return;
    }

    url = config.ebsitrustedapp + "/authorized-apps/" + me;

    try {
      console.log(url);
      response = await axios.get(url);
    } catch (error) {
      res.status(500).send("Internal error");
      console.log(error);
      return;
    }

    var authorizedApps = response.data;
    var authApp = false;
    for (var i in authorizedApps) {
      if (i === payload.iss && authorizedApps[i] === true) {
        authApp = true;
        break;
      }
    }

    if (authApp) {
      res.send({ token: generateToken(me) });
    } else {
      res.status(400).send("Not authorized app");
    }
  };
}

function handleToken(appName) {
  return function(req, res, next) {
    var token = getToken(req);
    try {
      var payload = jose.JWT.verify(token, config.jwt[appName].privKey);
      if (!payload.exp || payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
      if (payload.aud !== appName) {
        throw new Error("Token with incorrect audience");
      }
      req.user = payload;
    } catch (error) {
      req.user = null;
      debug("token")("Token verification failed");
      debug("token")(error.message);
    }
    next();
  };
}

module.exports = {
  login: login,
  handleToken: handleToken
};
