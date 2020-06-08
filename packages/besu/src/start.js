const config = require("./config");
const Server = require("./server");

new Server().start(config.port);
