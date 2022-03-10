module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
  return async (
    deployer: Truffle.Deployer,
    network: string,
    accounts: string[]
  ) => {
    const Migrations = artifacts.require("Migrations");

    await deployer.deploy(Migrations);
  };
};
