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

  it("user1 should not be able to register existing name, after expiration", async () => {
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

    // name expires
    await advanceTime(initialLockDuration.add(initialLockDuration).toNumber());

    // user1 registeres the same name1
    await truffleAssert.fails(
      instance.register(name1, {
        from: user1Account,
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

  it("user1 should be able to renew the expired name", async () => {
    // user1 registers the name1
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // name expires
    await advanceTime(initialLockDuration.add(initialLockDuration).toNumber());

    // user1 renews name1

    receipt = await instance.renew(name1, {
      from: user1Account,
    });

    // Get transaction details & latest block
    const latestBlock = await web3.eth.getBlock("latest");

    // Calculate locked balance based on fee and name
    const lockedBalance = initialPricePerChar.mul(
      web3.utils.toBN(name1.length)
    );

    truffleAssert.eventEmitted(receipt, "NameRenewed", (event: any) => {
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
  });

  it("user1 should not be able to renew the name not registered.", async () => {
    // user1 renews the name1, which is not registered.
    await truffleAssert.fails(
      instance.renew(name1, {
        from: user1Account,
      }),
      "Name is not registered yet."
    );
  });

  it("user1 should not be able to renew the name being used.", async () => {
    // user1 registers the name1
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    await truffleAssert.fails(
      instance.renew(name1, {
        from: user1Account,
      }),
      "Name is currently being used."
    );
  });

  it("user1 should not be able to renew the name registered by user2.", async () => {
    // user2 registers the name1
    let receipt = await instance.register(name1, {
      from: user2Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user2Account.toString() &&
        event.name.toString() === name1
      );
    });

    // name expires
    await advanceTime(initialLockDuration.add(initialLockDuration).toNumber());

    // user1 renews the name1
    await truffleAssert.fails(
      instance.renew(name1, {
        from: user1Account,
      }),
      "Only name owner can renew the name."
    );
  });

  it("user1 should be able to claim the balance for the names expired", async () => {
    // Keep the user account original balance
    const originalBalance = await web3.eth.getBalance(user1Account);

    // Calculate locked balance based on fee and name
    const lockedBalance = initialPricePerChar.mul(
      web3.utils.toBN(name1.length)
    );

    // Register the name
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    // Get transaction details & latest block
    const tx1 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock1 = await web3.eth.getBlock("latest");
    const gasPrice1 = web3.utils
      .toBN(tx1.gasPrice)
      .mul(web3.utils.toBN(latestBlock1.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1 &&
        event.lockedBalance.toString() === lockedBalance.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock1.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    // Compare current balance
    let currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance)
        .sub(gasPrice1)
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(lockedBalance)}.`
    );

    // name expires
    await advanceTime(initialLockDuration.add(initialLockDuration).toNumber());

    // user1 claims the balance
    receipt = await instance.claim({ from: user1Account });

    // Get transaction details & latest block
    const tx2 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock2 = await web3.eth.getBlock("latest");
    const gasPrice2 = web3.utils
      .toBN(tx2.gasPrice)
      .mul(web3.utils.toBN(latestBlock2.gasUsed));

    truffleAssert.eventEmitted(receipt, "ClaimedBalance", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.balance.toString() === lockedBalance.toString()
      );
    });

    // Compare current balance
    currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils.toBN(originalBalance).sub(gasPrice1).sub(gasPrice2).toString(),
      `User did not claim the proper amount.`
    );
  });

  it("user1 should be able to claim the balance for only the names expired", async () => {
    // Keep the user account original balance
    const originalBalance = await web3.eth.getBalance(user1Account);

    // Register the name1
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    const lockedBalance1 = initialPricePerChar.mul(
      web3.utils.toBN(name1.length)
    );

    const tx1 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock1 = await web3.eth.getBlock("latest");
    const gasPrice1 = web3.utils
      .toBN(tx1.gasPrice)
      .mul(web3.utils.toBN(latestBlock1.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1 &&
        event.lockedBalance.toString() === lockedBalance1.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock1.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    let currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance1)
        .sub(gasPrice1)
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(lockedBalance1)}.`
    );

    // name expires
    await advanceTime(initialLockDuration.add(initialLockDuration).toNumber());

    // registers name2
    receipt = await instance.register(name2, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    const lockedBalance2 = initialPricePerChar.mul(
      web3.utils.toBN(name2.length)
    );

    const tx2 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock2 = await web3.eth.getBlock("latest");
    const gasPrice2 = web3.utils
      .toBN(tx2.gasPrice)
      .mul(web3.utils.toBN(latestBlock2.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name2 &&
        event.lockedBalance.toString() === lockedBalance2.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock2.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    // Compare current balance
    currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance1)
        .sub(lockedBalance2)
        .sub(gasPrice1)
        .sub(gasPrice2)
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(
        lockedBalance1.add(lockedBalance2)
      )}.`
    );

    // user1 claims the balance
    receipt = await instance.claim({ from: user1Account });

    // Get transaction details & latest block
    const tx3 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock3 = await web3.eth.getBlock("latest");
    const gasPrice3 = web3.utils
      .toBN(tx3.gasPrice)
      .mul(web3.utils.toBN(latestBlock3.gasUsed));

    truffleAssert.eventEmitted(receipt, "ClaimedBalance", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.balance.toString() === lockedBalance1.toString()
      );
    });

    // Compare current balance
    currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(gasPrice1)
        .sub(lockedBalance2)
        .sub(gasPrice2)
        .sub(gasPrice3)
        .toString(),
      `User did not claim the proper amount.`
    );
  });

  it("user1 should be able to claim the balance for all the names expired", async () => {
    // Keep the user account original balance
    const originalBalance = await web3.eth.getBalance(user1Account);

    // Register the name1
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    const lockedBalance1 = initialPricePerChar.mul(
      web3.utils.toBN(name1.length)
    );

    const tx1 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock1 = await web3.eth.getBlock("latest");
    const gasPrice1 = web3.utils
      .toBN(tx1.gasPrice)
      .mul(web3.utils.toBN(latestBlock1.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1 &&
        event.lockedBalance.toString() === lockedBalance1.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock1.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    let currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance1)
        .sub(gasPrice1)
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(lockedBalance1)}.`
    );

    // name expires
    await advanceTime(initialLockDuration.add(initialLockDuration).toNumber());

    // registers name2
    receipt = await instance.register(name2, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    const lockedBalance2 = initialPricePerChar.mul(
      web3.utils.toBN(name2.length)
    );

    const tx2 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock2 = await web3.eth.getBlock("latest");
    const gasPrice2 = web3.utils
      .toBN(tx2.gasPrice)
      .mul(web3.utils.toBN(latestBlock2.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name2 &&
        event.lockedBalance.toString() === lockedBalance2.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock2.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    // Compare current balance
    currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance1)
        .sub(lockedBalance2)
        .sub(gasPrice1)
        .sub(gasPrice2)
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(
        lockedBalance1.add(lockedBalance2)
      )}.`
    );

    // name expires
    await advanceTime(initialLockDuration.add(initialLockDuration).toNumber());

    // user1 claims the balance
    receipt = await instance.claim({ from: user1Account });

    // Get transaction details & latest block
    const tx3 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock3 = await web3.eth.getBlock("latest");
    const gasPrice3 = web3.utils
      .toBN(tx3.gasPrice)
      .mul(web3.utils.toBN(latestBlock3.gasUsed));

    truffleAssert.eventEmitted(receipt, "ClaimedBalance", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.balance.toString() ===
          lockedBalance1.add(lockedBalance2).toString()
      );
    });

    // Compare current balance
    currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(gasPrice1)
        .sub(gasPrice2)
        .sub(gasPrice3)
        .toString(),
      `User did not claim the proper amount.`
    );
  });

  it("user1 should be able to release the name after registration", async () => {
    // user1 registers the name1
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user1 releases the name1
    receipt = await instance.release(name1, {
      from: user1Account,
    });

    truffleAssert.eventEmitted(receipt, "NameReleased", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });
  });

  it("user2 should not be able to release the name1, which user1 registered", async () => {
    // user1 registers the name1
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user2 releases the name1
    await truffleAssert.fails(
      instance.release(name1, {
        from: user2Account,
      }),
      "Only name owner can release the name."
    );
  });

  it("user1 should not be able to release the name before registration", async () => {
    // user1 releases the name1
    await truffleAssert.fails(
      instance.release(name1, {
        from: user1Account,
      }),
      "Name is not registered yet."
    );
  });

  it("user2 should be able to register same name after user1 releases the name", async () => {
    // user1 registers the name1
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user1 releases the name1
    receipt = await instance.release(name1, {
      from: user1Account,
    });

    truffleAssert.eventEmitted(receipt, "NameReleased", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user2 registers the name1
    // Keep the user account original balance
    const originalBalance = await web3.eth.getBalance(user2Account);

    // Calculate locked balance based on fee and name
    const lockedBalance = initialPricePerChar.mul(
      web3.utils.toBN(name1.length)
    );

    // Register the name
    receipt = await instance.register(name1, {
      from: user2Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    // Get transaction details & latest block
    const tx1 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock1 = await web3.eth.getBlock("latest");
    const gasPrice1 = web3.utils
      .toBN(tx1.gasPrice)
      .mul(web3.utils.toBN(latestBlock1.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user2Account.toString() &&
        event.name.toString() === name1 &&
        event.lockedBalance.toString() === lockedBalance.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock1.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    // Compare current balance
    let currentBalance = await web3.eth.getBalance(user2Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance)
        .sub(gasPrice1)
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(lockedBalance)}.`
    );
  });

  it("user1 should be able to claim the balance for the released name", async () => {
    // Keep the user account original balance
    const originalBalance = await web3.eth.getBalance(user1Account);

    // Calculate locked balance based on fee and name
    const lockedBalance = initialPricePerChar.mul(
      web3.utils.toBN(name1.length)
    );

    // Register the name
    let receipt = await instance.register(name1, {
      from: user1Account,
      value: web3.utils.toWei("0.01", "ether"),
    });

    // Get transaction details & latest block
    const tx1 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock1 = await web3.eth.getBlock("latest");
    const gasPrice1 = web3.utils
      .toBN(tx1.gasPrice)
      .mul(web3.utils.toBN(latestBlock1.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameRegistered", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1 &&
        event.lockedBalance.toString() === lockedBalance.toString() &&
        event.lockedUntil.toString() ===
          web3.utils
            .toBN(latestBlock1.timestamp)
            .add(initialLockDuration)
            .toString()
      );
    });

    // Compare current balance
    let currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(lockedBalance)
        .sub(gasPrice1)
        .toString(),
      `User balance is not locked by ${web3.utils.toWei(lockedBalance)}.`
    );

    // user1 releases the name1
    receipt = await instance.release(name1, { from: user1Account });
    const tx2 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock2 = await web3.eth.getBlock("latest");
    const gasPrice2 = web3.utils
      .toBN(tx2.gasPrice)
      .mul(web3.utils.toBN(latestBlock2.gasUsed));

    truffleAssert.eventEmitted(receipt, "NameReleased", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.name.toString() === name1
      );
    });

    // user1 claims the balance
    receipt = await instance.claim({ from: user1Account });

    // Get transaction details & latest block
    const tx3 = await web3.eth.getTransaction(receipt.tx);
    const latestBlock3 = await web3.eth.getBlock("latest");
    const gasPrice3 = web3.utils
      .toBN(tx3.gasPrice)
      .mul(web3.utils.toBN(latestBlock3.gasUsed));

    truffleAssert.eventEmitted(receipt, "ClaimedBalance", (event: any) => {
      return (
        event.owner.toString() === user1Account.toString() &&
        event.balance.toString() === lockedBalance.toString()
      );
    });

    // Compare current balance
    currentBalance = await web3.eth.getBalance(user1Account);
    assert.equal(
      currentBalance,
      web3.utils
        .toBN(originalBalance)
        .sub(gasPrice1)
        .sub(gasPrice2)
        .sub(gasPrice3)
        .toString(),
      `User did not claim the proper amount.`
    );
  });
});
