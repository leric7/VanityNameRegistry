module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
  return async (
    deployer: Truffle.Deployer,
    network: string,
    accounts: string[]
  ) => {
    const VanityNameRegistry = artifacts.require("VanityNameRegistry");

    await deployer.deploy(
      VanityNameRegistry,
      web3.utils.toWei("0.0001", "ether"),
      1 * 60 * 60
    );

    console.log(`VanityNameRegistry is deployed on ${network}`);
  };
};
