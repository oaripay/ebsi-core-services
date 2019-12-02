const CASAuthentication = require('../cas-authentication');

// ECAS
const ecas = new CASAuthentication({
  cas_url: 'https://ecas.acceptance.ec.europa.eu/cas',
  service_url: 'http://localhost:3000/user',
  cas_version: '3.0',
  session_name: 'ecas_session',
  session_info: 'ecas_session_info',
  destroy_session: true
});


module.exports = ecas;
