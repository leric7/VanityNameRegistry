# Vanity Name Registry

## Description

A vanity name registering system resistant against frontrunning.

An unregistered name can be registered for a certain amount of time by locking a certain balance of an account. After the registration expires, the account loses ownership of the name and his balance is unlocked. The registration can be renewed by making an on-chain call to keep the name registered and balance locked. The locking amount and period should be configured when deploying the contract, and the owner can modify later. The fee to register the name depends directly on the size of the name. A malicious node/validator should not be able to front-run the process by censoring transactions of an honest user and registering its name in its own account.

## Contract

### Variables

| Name               | Type                            | Visibility  | Description                                                                                             |
| ------------------ | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| **orders**         | `mapping(uint256 => Order)`     | `public`    | Name registration orders                                                                                |
| **orderNumber**    | `uint256`                       | `public`    | Order number tracking                                                                                   |
| **nameRegistry**   | `mapping(bytes32 => uint256)`   | `public`    | Name registry, it has link to the `order` for the `name` entry.                                         |
| **owned**          | `mapping(address => uint256[])` | `public`    | Names owned by the account                                                                              |
| _**pricePerChar**_ | `uint256`                       | _`private`_ | Registration price per character, it is initialized when deployed, and can modified later by the owner. |
| _**lockDuration**_ | `uint256`                       | _`private`_ | Name lock duration, it is initialized when deployed, and can modified later by the owner.               |

### Modifiers

| Name               | Args                 | Description                       |
| ------------------ | -------------------- | --------------------------------- |
| **nameRegistered** | `string memory name` | Make sure the name is registered. |

### Functions

| Name                     | Visibility            | Modifider        | Args                      | Returns   | Description                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | --------------------- | ---------------- | ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **setPricePerChar**      | `external`            | `onlyOwner`      | `uint256 newPricePerChar` |           | Sets the new registration price per character.                                                                                                                                                                                                                                                                                                                                                                                  |
| **getPricePerChar**      | `external`            | `onlyOwner`      |                           | `uint256` | Gets the registration price per character.                                                                                                                                                                                                                                                                                                                                                                                      |
| **setLockDuration**      | `external`            | `onlyOwner`      | `uint256 newLockDuration` |           | Sets the new lock duration for the name.                                                                                                                                                                                                                                                                                                                                                                                        |
| **getLockDuration**      | `external`            | `onlyOwner`      |                           | `uint256` | Gets the lock duration for the name.                                                                                                                                                                                                                                                                                                                                                                                            |
| **register**             | `external`, `payable` | `nonReentrant`   | `string memory name`      |           | Registers a new name for the user. The name should have to be available(not registered yet). User have to send some funds to pay registration fees. Fees are calculated based on the length of the name. Any remaining funds are paid back to the user after the name registration. _`front-running`_ attack is prevented by `nameAvailable` modifier. It prevents user from losing any money by registering the existing name. |
| **renew**                | `external`            | `nameRegistered` | `string memory name`      |           | Renews a name for the user. Only the name owner can renew the name. The name must be registered and expired to be renewed.                                                                                                                                                                                                                                                                                                      |
| **release**              | `external`            | `nameRegistered` | `string memory name`      |           | Releases the registered name. Only the name owner can release the name. User can claim the balance that was locked after releasing the name.                                                                                                                                                                                                                                                                                    |
| **claim**                | `external`            | `nonReentrant`   |                           |           | Claims the balance for the names expired.                                                                                                                                                                                                                                                                                                                                                                                       |
| _**getRegistrationFee**_ | `internal`, `view`    |                  | `string memory name`      | `uint256` | Calculates the registration fee based on name. **Formula: `pricePerChar` \* `name.length`**                                                                                                                                                                                                                                                                                                                                     |
| _**encodeName**_         | `internal`, `pure`    |                  | `string memory name`      | `bytes32` | Calculate the hash of the name.                                                                                                                                                                                                                                                                                                                                                                                                 |

### Events

| Name                    | Args                                                                     | Description                                 |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| **PricePerCharChanged** | `uint256 newPricePerChar`                                                | Emitted when the `pricePerChar` is changed. |
| **LockDurationChanged** | `uint256 newLockDuration`                                                | Emitted when the `lockDuration` is changed. |
| **NameRegistered**      | `address owner, string name, uint256 lockedBalance, uint256 lockedUntil` | Emitted when a new name is registered.      |
| **NameRenewed**         | `address owner, string name, uint256 lockedBalance, uint256 lockedUntil` | Emitted when a new name is renewed.         |
| **ClaimedBalance**      | `address owner, uint256 balance`                                         | Emitted when user claims the balance.       |
