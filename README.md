![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Storage API

Storage API is a Core Service of the EBSI platform providing access to the Off-chain Storage services of the lower layer Chain & Storage. This API provides read and write storage capabilities of files, Key-Value, and notifications (notifications only for wallet).

File Storage API provides read and write files capabilities to off-chain distributed storage in v1 and, in the future, to off-chain private (local) storage and off-chain external storage trusted providers.

- Data stored: uuid, filename, hash, binary data (max size 16MB)

Key-Value Storage API provides capabilities to save Key-Value (with data value in JSON format) in the off-chain distributed storage for v1.

- Data stored: key (max size 256 bytes), value (max size 1MB)

Notification Storage API provides capabilities to store notifications in the off-chain distributed storage for v1. This API is used by the wallet in order to handle notifications.

## Installation

Clone the repository and move to the project directory

```sh
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/storage-api.git
```

Create a .env file with the private key used in the API:

```
API_PRIVATE_KEY=023e3d80808...
```

This private key can be generated using ethers: https://docs.ethers.io/ethers.js/html/api-wallet.html or just taking a random string of 64 characters in hex format.

Define the enviroment (local, integration, development, production):

```
EBSI_ENV=integration
```

Define consistency desired for read/write operations in cassandra (this api is not using lightweight transactions).

```
CONSISTENCY=one
```

There are 10 possible values for consistency and serial consistency.

- **any**. Writing: A write must be written to at least one node. If all replica nodes for the given row key are down, the write can still succeed after a hinted handoff has been written. If all replica nodes are down at write time, an ANY write is not readable until the replica nodes for that row have recovered.
- **one**. Returns a response from the closest replica, as determined by the snitch.
- **two**. Returns the most recent data from two of the closest replicas.
- **three**. Returns the most recent data from three of the closest replicas.
- **quorum**. Reading: Returns the record with the most recent timestamp after a quorum of replicas has responded regardless of data center. Writing: A write must be written to the commit log and memory table on a quorum of replica nodes.
- **all**. Reading: Returns the record with the most recent timestamp after all replicas have responded. The read operation will fail if a replica does not respond. Writing: A write must be written to the commit log and memory table on all replica nodes in the cluster for that row.
- **localQuorum**. Reading: Returns the record with the most recent timestamp once a quorum of replicas in the current data center as the coordinator node has reported. Writing: A write must be written to the commit log and memory table on a quorum of replica nodes in the same data center as the coordinator node. Avoids latency of inter-data center communication.
- **eachQuorum**. Reading: Returns the record once a quorum of replicas in each data center of the cluster has responded. Writing: Strong consistency. A write must be written to the commit log and memtable on a quorum of replica nodes in all data centers.
- **localOne**. Similar to One but only within the DC the coordinator is in.

For building, you can choose to build with Docker (recommended) or to build from source directly.

### Build with docker

Run:

```sh
docker-compose up --build
```

Create the keyspace in Cassandra. First: enter into the container:

```sh
docker exec -it cassandradb bash
```

Enter into the cassandra command line:

```sh
cqlsh
```

And finally define the keyspace:

```sh
create keyspace ebsi_integration with replication = {'class':'SimpleStrategy','replication_factor':1};
```

For testing purposes, set `replication_factor` to 1, because there is only 1 node. For production, it is recommended to use `NetworkTopologyStrategy` with a `replication_factor` of 3.

```sh
create keyspace ebsi_integration with replication = { 'class':'NetworkTopologyStrategy', 'datacenter1' : 3, 'datacenter2': 3};
```

The API connects with this keyspace and create the tables automatically.

The API will be accesible at http://localhost:8080

### Build from source

Install libraries and dependencies:

```sh
yarn install
```

Edit `./src/config.js` to define the connection with cassandra. By default it will try to access the container "cassandradb" or "localhost".

Start the API:

```sh
yarn run start
```

The API will be accesible at http://localhost:8080

## Tests

Tests for File Storage, Key Value Storage, and Notification Storage and their connection with Cassandra. Create an `.env` file using `.env.example` and update the corresponding values.

For e2e tests, TEST_APP_NAME and TEST_APP_PRIVATE_KEY need to be a valid app registered in the Trusted App Registry.

Before launching the tests run cassandra using the docker in the tests folder:

```sh
cd tests
docker-compose up --build
```

Create the keyspace in Cassandra. First, enter into the container:

```sh
docker exec -it cassandradb_test bash
```

Enter to the cassandra command line:

```sh
cqlsh
```

And finally define the keyspace:

```sh
create keyspace ebsi_integration with replication = {'class':'SimpleStrategy','replication_factor':1};
```

Now, launch the unit tests and e2e tests:

```sh
yarn run test
```

To connect with a local API for e2e testing, run:

```sh
EBSI_ENV=local EBSI_API=http://localhost:8080 yarn run test
```

To run only unit tests (cassandra container is not necessary):

```sh
yarn run test:unit
```

To run only integration tests, launch cassandra and run:

```sh
yarn run test:e2e
```

### Test consistency level in a network

Consistency refers to the level of replication we want to achieve for each write/read in cassandra. Start the network defined in `tests/docker-compose-network.yml`.

```sh
docker-compose -f tests/docker-compose-network.yml up --build
```

This compose will start 3 nodes in cassandra with the following topology: One node in the datacenter `datacenter1` and two nodes in the datacenter `datacenter2`, and all of them in the cluster `c1`.

Enter to the first node and define the network strategy:

```
docker exec -it cassandra-node1 bash
cqlsh
create keyspace ebsi_integration with replication = { 'class':'NetworkTopologyStrategy', 'datacenter1' : 1, 'datacenter2' : 2};
```

The setup is ready to test the network. Run the e2e tests defining quorum consistency:

```
EBSI_ENV=local CONSISTENCY=quorum yarn test:e2e
```

If you stop 2 nodes in the network and run again the tests it will fail.

Now use local consistency

```
EBSI_ENV=local CONSITENCY=localQuorum yarn test:e2e
```

Using this consistency the API will only accept the confirmation of the datacenter `datacenter1`, which is the local datacenter defined in the api.

### Troubleshooting

If a node crashes try to restart it again. If you see the error `Not marking nodes down due to local pause` this is probably related to limitations in the hardware. Create a network with only 2 nodes and try again.

Refs:

- https://support.datastax.com/hc/en-us/articles/360002677617-FAQ-What-does-FailureDetector-Not-marking-nodes-down-due-to-local-pause-mean-
- https://docs.datastax.com/en/dse-planning/doc/planning/capacityPlanning.html

## OpenAPI documentation

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Storage%20API

## Licensing

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
