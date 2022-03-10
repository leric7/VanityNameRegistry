// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

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
        uint256 balance;
        uint256 lockTime;
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
    event PricePerCharChanged(uint256 newPricePerChar);
    event LockDurationChanged(uint256 newLockDuration);

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
}
