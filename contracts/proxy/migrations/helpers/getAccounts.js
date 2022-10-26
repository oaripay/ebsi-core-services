function getAccounts(accounts) {
  const proxyAdmin = accounts[0];
  const pauser1 = accounts[1];
  const pauser2 = accounts[2];

  const pausers = [pauser1, pauser2];
  return {
    proxyAdmin,
    pausers,
  };
}
module.exports = getAccounts;
