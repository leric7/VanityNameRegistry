const VanityNameRegistry = artifacts.require("VanityNameRegistry");

contract("VanityNameRegistry", (accounts) => {
  it("should be deployed", async () => {
    const instance = await VanityNameRegistry.deployed();

    const pricePerChar = await instance.getPricePerChar();
    const lockDuration = await instance.getLockDuration();
    const orderNumber = await instance.orderNumber();

    assert.equal(
      pricePerChar.toString(),
      web3.utils.toBN(web3.utils.toWei("0.1", "ether")).toString(),
      "initial pricePerChar should be 0.1 ether"
    );

    assert.equal(
      lockDuration.toString(),
      web3.utils.toBN(1 * 60 * 60).toString(),
      "initial lockDuration should be 1 hour"
    );

    assert.equal(
      orderNumber.toString(),
      web3.utils.toBN(0).toString(),
      "initial orderNumber should be 0"
    );
  });
});
