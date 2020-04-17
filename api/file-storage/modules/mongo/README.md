# EBSI Mongo

Module to write/read documents in mongodb.
Prerequisites: Nodejs server with express.

### Setup

Import the modules

```js
var mongoose = require("mongoose");
var EBSImongo = require("./modules/mongo");
```

Start a new mongo client

```js
mongoose.connect("mongodb://localhost:27017/ebsi", opts, function(err) {
  if (err) throw err;
  console.log("==> Connected with MongoDB");
});
```

### Store

Use the method `storeFile` to store files in mongo. Put in the request the location of the file, the filename, and the public key of the owner.

```js
function store(req, res) {
  req.tempfile = "/home/user/et670k3.tmp";
  req.filename = "my_file.pdf";
  req.public_key = "0x0000000000000000000000000000000000000000";
  EBSImongo.storeFile(req, res, () => {
    console.log("File stored");
  });
}
```

### Read

To retrieve files, the `readFile` method expects a hash in the params of the query, and that the user is authenticated.

```js
function read(req, res){
  req.user = {
    public_key = '0x0000000000000000000000000000000000000000'
  }
  req.params.hash = '0x2765899c7a8a5cd76d175858d502c77c627020ae82419c9b442d11ea9c9148b1'
  EBSImongo.readFile(req, res, (found)=>{
    if(!found) res.send({ok:false, message:'File not found'})
  })
}
```
