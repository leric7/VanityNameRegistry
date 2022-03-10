const VanityNameRegistry = artifacts.require("VanityNameRegistry");
const truffleAssert = require("truffle-assertions");

contract("VanityNameRegistry", (accounts) => {
  const ownerAccount = accounts[0];
  const user1Account = accounts[1];
  const user2Account = accounts[2];

  it("should be deployed, and intialized", async () => {
    const instance = await VanityNameRegistry.deployed();

    const pricePerChar = await instance.getPricePerChar();
    const lockDuration = await instance.getLockDuration();
    const orderNumber = await instance.orderNumber();

    assert.equal(
      pricePerChar.toString(),
      web3.utils.toBN(web3.utils.toWei("0.0001", "ether")).toString(),
      "initial pricePerChar should be 0.0001 ether"
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

  it("owner should be able to modify pricePerChar, and PricePerChanged event should be emitted", async () => {
    const instance = await VanityNameRegistry.deployed();

    const newPricePerChar = web3.utils.toBN(
      web3.utils.toWei("0.0002", "ether")
    );
    const tx = await instance.setPricePerChar(newPricePerChar);
    truffleAssert.eventEmitted(tx, "PricePerCharChanged", (event: any) => {
      return event.pricePerChar.toString() === newPricePerChar.toString();
    });

    const pricePerChar = await instance.getPricePerChar();
    assert.equal(
      pricePerChar.toString(),
      newPricePerChar.toString(),
      `New pricePerChar should be ${newPricePerChar.toString()}`
    );
  });

  it("user should not be able to read/modify pricePerChar", async () => {
    const instance = await VanityNameRegistry.deployed();

    await truffleAssert.fails(
      instance.getPricePerChar({ from: user1Account }),
      "Ownable: caller is not the owner"
    );

    const newPricePerChar = web3.utils.toBN(
      web3.utils.toWei("0.0002", "ether")
    );

    await truffleAssert.fails(
      instance.setPricePerChar(newPricePerChar, { from: user1Account }),
      "Ownable: caller is not the owner"
    );
  });

  it("owner should be able to modify lockDuration, and LockDurationChanged event should be emitted", async () => {
    const instance = await VanityNameRegistry.deployed();

    const newLockDuration = web3.utils.toBN(2 * 60 * 60);
    const tx = await instance.setLockDuration(newLockDuration);
    truffleAssert.eventEmitted(tx, "LockDurationChanged", (event: any) => {
      return event.lockDuration.toString() === newLockDuration.toString();
    });

    const lockDuration = await instance.getLockDuration();
    expect(lockDuration.toString()).to.equal(newLockDuration.toString());
    assert.equal(
      lockDuration.toString(),
      newLockDuration.toString(),
      `New lockDuration should be ${newLockDuration.toString()}.`
    );
  });

  it("user should not be able to read/modify lockDuration", async () => {
    const instance = await VanityNameRegistry.deployed();

    await truffleAssert.reverts(
      instance.getLockDuration({ from: user1Account }),
      "Ownable: caller is not the owner"
    );

    const newLockDuration = web3.utils.toBN(2 * 60 * 60);

    await truffleAssert.reverts(
      instance.setLockDuration(newLockDuration, { from: user1Account }),
      "Ownable: caller is not the owner"
    );
  });
});
