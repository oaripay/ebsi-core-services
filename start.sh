#!/bin/sh

# Start Besu API
node /usr/src/api/besu/src/start.js &

# Start Fabric API
java -Djava.security.egd=file:/dev/./urandom -jar /usr/src/api/fabric/fabric-0.0.1-SNAPSHOT.jar
