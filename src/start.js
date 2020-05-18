const config = require("./config");
const Server = require("./server");

const server = new Server().start(config.port);

module.exports = server;
