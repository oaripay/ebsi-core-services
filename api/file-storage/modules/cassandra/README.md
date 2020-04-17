# EBSI Cassandra

Module to write/read documents in cassandra.
Prerequisites: Nodejs server with express.

### Setup

Import the modules

```js
var cassandraDriver = require("cassandra-driver");
var EBSIcassandra = require("./modules/cassandra");
```

Start a new cassandra client

```js
const client = new cassandraDriver.Client({
  contactPoints: ["100.21.0.3"],
  localDataCenter: "datacenter1",
  keyspace: "development"
});

client.connect(function(err) {
  if (err) throw err;
  console.log("==> Connected with Cassandra");
});
```

Set this client in EBSIcassandra

```js
const ebsi_cassandra = new EBSIcassandra({ client: client });
```

### Store

Use the method `store` to store files in cassandra. Put in the request the location of the file, the filename, and the public key of the owner.

```js
function store(req, res) {
  req.tempfile = "/home/user/et670k3.tmp";
  req.filename = "my_file.pdf";
  req.public_key = "0x0000000000000000000000000000000000000000";
  ebsi_cassandra.store(req, res, () => {
    console.log("File stored");
  });
}
```

### Read

To retrieve files, the `read` method expects a hash in the params of the query, and that the user is authenticated.

```js
function read(req, res){
  req.user = {
    public_key = '0x0000000000000000000000000000000000000000'
  }
  req.params.hash = '0x2765899c7a8a5cd76d175858d502c77c627020ae82419c9b442d11ea9c9148b1'
  ebsi_cassandra.read(req, res, (found)=>{
    if(!found) res.send({ok:false, message:'File not found'})
  })
}
```
