#!/bin/bash
CONTAINER="cassandradb_test"

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

# TABLES

echo creating table file_storage
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"create table $CASSANDRA_KEYSPACE.file_storage (did text, hash text, data blob, metadata text, primary key(did, hash));\""

echo creating table key_value_storage
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"create table $CASSANDRA_KEYSPACE.key_value_storage (did text, key text, value text, primary key(did, key))
;\""

echo creating table app_usage
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"create table $CASSANDRA_KEYSPACE.app_usage (did text, number_bytes text, primary key(did));\""

echo creating table notification_storage
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"create table $CASSANDRA_KEYSPACE.notification_storage (id uuid, sender text, receiver text, message text, primary key(id));\""

echo creating table attribute_storage
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"create table $CASSANDRA_KEYSPACE.attribute_storage (id uuid, did text, hash text, data text, primary key(id));\""

echo creating indexes
echo notification_storage: creating index for receiver column
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"create index on $CASSANDRA_KEYSPACE.notification_storage (receiver);\""

# PERMISSIONS

echo granting permissions to $CASSANDRA_USER
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant select on table $CASSANDRA_KEYSPACE.file_storage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant modify on table $CASSANDRA_KEYSPACE.file_storage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant select on table $CASSANDRA_KEYSPACE.key_value_storage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant modify on table $CASSANDRA_KEYSPACE.key_value_storage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant select on table $CASSANDRA_KEYSPACE.app_usage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant modify on table $CASSANDRA_KEYSPACE.app_usage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant select on table $CASSANDRA_KEYSPACE.notification_storage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant modify on table $CASSANDRA_KEYSPACE.notification_storage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant select on table $CASSANDRA_KEYSPACE.attribute_storage to $CASSANDRA_USER;\""
docker exec -t $CONTAINER bash -c "cqlsh -u cassandra -p cassandra -e \"grant modify on table $CASSANDRA_KEYSPACE.attribute_storage to $CASSANDRA_USER;\""

exit 0
