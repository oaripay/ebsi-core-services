const cassandraDriver = require("cassandra-driver");
const config = require("./config");

const cassandraConnection = config.cassandra.connection;
const client = new cassandraDriver.Client(cassandraConnection);

module.exports = client;
