import { VanityNameRegistryInstance } from "../types/truffle-contracts";
import { advanceTime } from "../utils/time";

const VanityNameRegistry = artifacts.require("VanityNameRegistry");
const truffleAssert = require("truffle-assertions");

contract("VanityNameRegistry", (accounts) => {
  let instance: VanityNameRegistryInstance;

  const initialPricePerChar = web3.utils.toBN(
    web3.utils.toWei("0.0001", "ether")
  ); // Initial Price Per Character - 0.0001 ether
  const initialLockDuration = web3.utils.toBN(1 * 60 * 60); // Initial Lock Duration for 1 hour

  const ownerAccount = accounts[0];
  const user1Account = accounts[1];
  const user2Account = accounts[2];
  const name1 = "Apple";
  const name2 = "Amazon";
  const name3 = "Google";

  beforeEach(async function () {
    instance = await VanityNameRegistry.new(
      initialPricePerChar,
      initialLockDuration
    );
  });

  it("should be deployed, and intialized", async () => {
    const pricePerChar = await instance.getPricePerChar();
    const lockDuration = await instance.getLockDuration();
    const orderNumber = await instance.orderNumber();

    assert.equal(
      pricePerChar.toString(),
      initialPricePerChar.toString(),
      "initial pricePerChar should be 0.0001 ether"
    );

    assert.equal(
      lockDuration.toString(),
      initialLockDuration.toString(),
      "initial lockDuration should be 1 hour"
    );

    assert.equal(
      orderNumber.toString(),
      web3.utils.toBN(0).toString(),
      "initial orderNumber should be 0"
    );
  });

  it("owner should be able to modify pricePerChar, and PricePerChanged event should be emitted", async () => {
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

  it("user1 should be able to register a new name with balance locked", async () => {
    // Keep the user account original balance
    const originalBalance = await web3.eth.getBalance(user1Account);

    // Calculate locked balance based on fee and name
    const lockedBalance = initialPricePerChar.mul(
      web3.utils.toBN(name1.length)
    );

    // Register the name
    const receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    // Get transaction details & latest block
    const tx = await web3.eth.getTransaction(receipt.tx);
    const latestBlock = await web3.eth.getBlock("latest");

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1 &&
        event.lockedBalance.toString() === lockedBalance.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    // Compare current balance
    const currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance)
        .sub(
          web3.utils.toBN(tx.gasPrice).mul(web3.utils.toBN(latestBlock.gasUsed))
        )
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(lockedBalance)}.`
    );
  });

  it("user1 should not be able to register a new name with insufficient funds", async () => {
    // Register the name with insufficient funds
    await truffleAssert.fails(
      instance.register(name1, {
        from: user1Account,
        value: web3.utils.toWei("0.0001", "ether"),
      }),
      "Insufficient funds to register the name."
    );
  });

  it("user1 should not be able to register existing name", async () => {
    // user1 registers the name1
    const receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user1 registeres the same name1
    await truffleAssert.fails(
      instance.register(name1, {
        from: user1Account,
        value: web3.utils.toWei("0.01", "ether"),
      }),
      "Name is already registered."
    );
  });

  it("user2 should not be able to register existing name", async () => {
    // user1 registers the name1
    const receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user1 registeres the same name1
    await truffleAssert.fails(
      instance.register(name1, {
        from: user2Account,
        value: web3.utils.toWei("0.01", "ether"),
      }),
      "Name is already registered."
    );
  });

  it("user1 should be able to register multiple names", async () => {
    // user1 registers name1

    const receipt1 = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt1, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user1 registers name2
    const receipt2 = await instance.register(name2, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt2, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name2
      );
    });

    // two orders created
    const orderNumber = await instance.orderNumber();
    assert.equal(
      orderNumber.toString(),
      web3.utils.toBN(2).toString(),
      `Orders were not created.`
    );
  });
});
