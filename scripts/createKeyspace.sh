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

if [[ -z "$CASSANDRA_PASSWORD" ]]
then
  echo Error: CASSANDRA_PASSWORD is not defined
  exit 1
fi

echo creating keyspace $CASSANDRA_KEYSPACE
docker exec -t cassandradb bash -c "cqlsh -u cassandra -p cassandra -e \"create keyspace $CASSANDRA_KEYSPACE with replication = {'class':'SimpleStrategy','replication_factor':1};\""

echo creating user $CASSANDRA_USER
docker exec -t cassandradb bash -c "cqlsh -u cassandra -p cassandra -e \"create role '$CASSANDRA_USER' with password = '$CASSANDRA_PASSWORD' and login = true;\""
