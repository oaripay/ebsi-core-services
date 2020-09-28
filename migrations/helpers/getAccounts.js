function getAccounts(accounts) {
  const proxyAdmin = accounts[0];
  const operator = accounts[1];
  const pauser1 = accounts[2];
  const pauser2 = accounts[3];
  const pausers = [pauser1, pauser2];
  return {
    proxyAdmin,
    operator,
    pausers,
  };
}
module.exports = getAccounts;
