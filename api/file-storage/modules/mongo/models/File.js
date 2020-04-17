var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var file = new Schema({
  public_key: { type: String },
  hash: { type: String },
  filename: { type: String },
  data: { type: Buffer },
  metadata: { type: Schema.Types.Mixed }
});

var File = mongoose.model("File", file);
module.exports = File;
