// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// use safe math from openzepplin to prevent underflow and overflow
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// use ownable from openzeppelin
import "@openzeppelin/contracts/access/Ownable.sol";

// use reentrancy guard from openzeppelin
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract VanityNameRegistry is Ownable, ReentrancyGuard {
    // calling SafeMath will add extra functions to the uint data type
    using SafeMath for uint256;

    // Order struct to keep name registration orders
    struct Order {
        address owner;
        uint256 lockedBalance;
        uint256 lockedUntil;
    }

    // Name registration orders
    mapping(uint256 => Order) public orders;

    // Order number
    uint256 public orderNumber;

    // Name registry
    mapping(bytes32 => uint256) public nameRegistry;

    // Names owned by the account
    mapping(address => uint256[]) public owned;

    // Registration Price per character - initialized when deployed
    // Can be modified by owner
    uint256 private pricePerChar;

    // Lock duration - initialized when deployed
    // Can be modified by owner
    uint256 private lockDuration;

    // Events
    event PricePerCharChanged(uint256 pricePerChar);
    event LockDurationChanged(uint256 lockDuration);
    event NameRegistered(
        address owner,
        string name,
        uint256 lockedBalance,
        uint256 lockedUntil
    );
    event NameRenewed(
        address owner,
        string name,
        uint256 lockedBalance,
        uint256 lockedUntil
    );

    /**
     * Internal Functions
     */

    // Calculate the registration fee.
    function getRegistrationFee(string memory name)
        internal
        view
        returns (uint256)
    {
        return pricePerChar * bytes(name).length;
    }

    // Get hash of the name
    function encodeName(string memory name) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(name));
    }

    /**
     * constructor
     */
    constructor(uint256 initialPricePerChar, uint256 initialLockDuration) {
        // Set initial pricePerChar, lockDuration
        pricePerChar = initialPricePerChar;
        lockDuration = initialLockDuration;

        // Set Order Number
        orderNumber = 0;
    }

    /**
     * Setter & Getter for pricePerChar
     */
    function setPricePerChar(uint256 newPricePerChar) external onlyOwner {
        pricePerChar = newPricePerChar;

        emit PricePerCharChanged(newPricePerChar);
    }

    function getPricePerChar() external view onlyOwner returns (uint256) {
        return pricePerChar;
    }

    /**
     * Setter & Getter for lockDuration
     */
    function setLockDuration(uint256 newLockDuration) external onlyOwner {
        lockDuration = newLockDuration;

        emit LockDurationChanged(newLockDuration);
    }

    function getLockDuration() external view onlyOwner returns (uint256) {
        return lockDuration;
    }

    // Register the name
    // nameAvailable modifier protects user from frontrunning attacks, by simply not allowing the user to register the existing name.
    function register(string memory name) external payable nonReentrant {
        // Encode the name
        bytes32 nameEncoded = encodeName(name);

        require(nameRegistry[nameEncoded] == 0, "Name is already registered.");

        // Calculate the registration fee
        uint256 registrationFee = getRegistrationFee(name);

        // Check if user payed enough
        require(
            registrationFee <= msg.value,
            "Insufficient funds to register the name."
        );

        // Create a new order record
        Order memory order = Order({
            owner: msg.sender,
            lockedBalance: registrationFee,
            lockedUntil: block.timestamp + lockDuration
        });

        // Increase the order number
        orderNumber += 1;

        // Add a new order record
        orders[orderNumber] = order;

        // Link name to order record
        nameRegistry[nameEncoded] = orderNumber;

        // Add order link to the account
        owned[msg.sender].push(orderNumber);

        // Trigger the event
        emit NameRegistered(
            order.owner,
            name,
            order.lockedBalance,
            order.lockedUntil
        );

        // Pay back the remaining balance
        uint256 remainingBalance = msg.value - registrationFee;
        bool sent = payable(msg.sender).send(remainingBalance);
        require(sent, "Could not pay back remaining funds.");
    }

    // Renew the name
    function renew(string memory name) external {
        // Encode the name
        bytes32 nameEncoded = encodeName(name);
        uint256 nameOrderNumber = nameRegistry[nameEncoded];

        // Check if name is registered.
        require(nameOrderNumber != 0, "Name is not registered yet.");

        Order memory nameOrder = orders[nameOrderNumber];

        // Check if sender is order owner.
        require(
            nameOrder.owner == msg.sender,
            "Only name owner can renew the name."
        );
        // Check if name is expired.
        require(
            nameOrder.lockedUntil < block.timestamp,
            "Name is currently being used."
        );

        // Renew the name
        nameOrder.lockedUntil = block.timestamp + lockDuration;
        orders[orderNumber] = nameOrder;

        // Trigger the event
        emit NameRenewed(
            nameOrder.owner,
            name,
            nameOrder.lockedBalance,
            nameOrder.lockedUntil
        );
    }
}
