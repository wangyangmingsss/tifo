// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TifoTypes} from "./libraries/TifoTypes.sol";

/// @title FactionRegistry
/// @notice Records each user's faction + switching economics.
///         First join is free; switching costs `switchFee` (routed to WarChest).
contract FactionRegistry {
    address public immutable token;
    address public immutable warChest;

    mapping(address => uint8) internal _factionOf;
    mapping(address => bool) internal _enrolled;
    mapping(address => uint64) public enrolledAt;
    mapping(uint8 => uint256) public memberCount;
    uint256 public switchFee = 100e18;
    address public owner;

    event FactionJoined(address indexed user, uint8 indexed factionId, bool isSwitch);

    modifier onlyOwner() {
        if (msg.sender != owner) revert TifoTypes.NotOperator();
        _;
    }

    constructor(address token_, address warChest_) {
        token = token_;
        warChest = warChest_;
        owner = msg.sender;
        // Initialize all users to NO_FACTION implicitly (default 0 in mapping,
        // but we track enrollment separately via _enrolled).
    }

    /// @notice Join a faction. First time is free; switching costs switchFee.
    function joinFaction(uint8 factionId) external {
        if (factionId >= TifoTypes.FACTION_COUNT) revert TifoTypes.InvalidFaction(factionId);

        bool wasEnrolled = _enrolled[msg.sender];
        if (wasEnrolled) {
            uint8 current = _factionOf[msg.sender];
            if (current == factionId) revert TifoTypes.AlreadyInFaction(factionId);
            // Switching: charge fee
            memberCount[current] -= 1;
            _pullFee(msg.sender, switchFee);
        }

        _factionOf[msg.sender] = factionId;
        _enrolled[msg.sender] = true;
        enrolledAt[msg.sender] = uint64(block.timestamp);
        memberCount[factionId] += 1;

        emit FactionJoined(msg.sender, factionId, wasEnrolled);
    }

    /// @notice Returns true if user has joined any faction.
    function isEnrolled(address user) external view returns (bool) {
        return _enrolled[user];
    }

    /// @notice Returns the user's current faction id.
    function factionOf(address user) external view returns (uint8) {
        return _factionOf[user];
    }

    function setSwitchFee(uint256 fee) external onlyOwner {
        switchFee = fee;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function _pullFee(address from, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, warChest, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TifoTypes.TransferFailed();
        }
    }
}
