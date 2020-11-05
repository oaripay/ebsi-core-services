#!/bin/bash
if [[ -z "$CASSANDRA_KEYSPACE" ]]
then
  echo Error: CASSANDRA_KEYSPACE is not defined
  exit 1
fi

if [[ -z "$CASSANDRA_USER" ]]
then
  echo Error: CASSANDRA_USER is not defined
  exit 1
fi

echo creating table notification_storage
docker exec -t cassandradb bash -c "cqlsh -u cassandra -p cassandra -e \"create table $CASSANDRA_KEYSPACE.notification_storage (id text, issuanceDate timestamp, expirationDate timestamp, sender text, receiver text, message text, primary key(id));\""

echo creating index for receiver column
docker exec -t cassandradb bash -c "cqlsh -u cassandra -p cassandra -e \"create index on $CASSANDRA_KEYSPACE.notification_storage (receiver);\""

echo grant select permission to $CASSANDRA_USER
docker exec -t cassandradb bash -c "cqlsh -u cassandra -p cassandra -e \"grant select on table $CASSANDRA_KEYSPACE.notification_storage to $CASSANDRA_USER;\""

echo grant modify permission to $CASSANDRA_USER
docker exec -t cassandradb bash -c "cqlsh -u cassandra -p cassandra -e \"grant modify on table $CASSANDRA_KEYSPACE.notification_storage to $CASSANDRA_USER;\""
