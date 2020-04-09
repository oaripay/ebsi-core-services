var axios = require("axios");
var debugCurl = require("debug")("curl");

var curlCommand = {
  get(url, opts) {
    return `curl -X GET "${url}"${curlCommand.processOpts(opts)}`;
  },
  post(url, _data, opts) {
    var data = "";
    if (_data) {
      var _dataString = JSON.stringify(_data).replace(/"/g, '\\"');
      data = ` -d "${_dataString}"`;
    }
    return `curl -X POST "${url}"${data}${curlCommand.processOpts(opts)}`;
  },
  processOpts(opts) {
    var command = "";
    if (!opts) return command;
    if (opts.headers) {
      var key;
      for (key in opts.headers) {
        if (key === "post") continue;
        command += ` -H "${key}: ${opts.headers[key]}"`;
      }

      if (opts.headers.post) {
        for (key in opts.headers.post) {
          command += ` -H "${key}: ${opts.headers.post[key]}"`;
        }
      }
    }
    return command;
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function axiosOptions(token, opts) {
  if (!opts) opts = {};
  if (!opts.headers) opts.headers = {};
  if (token) opts.headers.Authorization = `Bearer ${token}`;

  // don't throw error for status >= 400
  opts.validateStatus = () => {
    return true;
  };

  return opts;
}

var axios2 = {
  get: function(url, token, opt) {
    var opts = axiosOptions(token, opt);
    debugCurl(curlCommand.get(url, opts));
    return axios.get(url, opts);
  },
  post: function(url, params, token, opt) {
    var opts = axiosOptions(token, opt);
    debugCurl(curlCommand.post(url, params, opts));
    return axios.post(url, params, opts);
  }
};

module.exports = {
  sleep,
  curlCommand,
  axiosOptions,
  axios2
};
