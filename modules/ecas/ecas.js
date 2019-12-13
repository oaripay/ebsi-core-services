const CASAuthentication = require('../cas-authentication');
const conf = require('../../service/conf');

// ECAS
const ecas = new CASAuthentication({
  cas_url: conf.casUrl,
  service_url: conf.serviceUrl,
  cas_version: '3.0',
  session_name: 'ecas_session',
  session_info: 'ecas_session_info',
  destroy_session: true
});


console.log('ECAS ************************************ cas_url: ', conf.casUrl);
console.log('ECAS ************************************ service_url: ', conf.serviceUrl);

module.exports = ecas;
