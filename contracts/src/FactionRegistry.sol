// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TifoTypes} from "./libraries/TifoTypes.sol";

/// @title FactionRegistry
/// @notice Records each user's faction affiliation and manages the switching economy.
/// @dev First join is free; switching factions costs `switchFee` (routed to WarChest).
///      `factionOf` and `isEnrolled` are single-SLOAD reads, called by TerritoryMap
///      on every rally.
contract FactionRegistry {
    address public immutable token;
    address public immutable warChest;

    mapping(address => uint8) internal _factionOf;
    mapping(address => bool) internal _enrolled;
    mapping(address => uint64) public enrolledAt;
    mapping(uint8 => uint256) public memberCount;
    uint256 public switchFee = 100e18;

    event FactionJoined(address indexed user, uint8 indexed factionId, bool isSwitch);

    constructor(address token_, address warChest_) {
        token = token_;
        warChest = warChest_;
    }

    /// @notice Join or switch to a faction.
    /// @param factionId The faction to join (0-47).
    /// @dev First call is free. Subsequent calls (switching) charge `switchFee`
    ///      which is transferred to the WarChest to recycle into the economy.
    function joinFaction(uint8 factionId) external {
        if (factionId >= TifoTypes.FACTION_COUNT) revert TifoTypes.InvalidFaction(factionId);

        bool isSwitch = _enrolled[msg.sender];
        if (isSwitch) {
            uint8 oldFaction = _factionOf[msg.sender];
            if (oldFaction == factionId) revert TifoTypes.AlreadyInFaction(factionId);
            memberCount[oldFaction]--;
            // charge switch fee -> WarChest
            _pull(msg.sender, warChest, switchFee);
        }

        _factionOf[msg.sender] = factionId;
        _enrolled[msg.sender] = true;
        enrolledAt[msg.sender] = uint64(block.timestamp);
        memberCount[factionId]++;

        emit FactionJoined(msg.sender, factionId, isSwitch);
    }

    function factionOf(address user) external view returns (uint8) {
        return _factionOf[user];
    }

    function isEnrolled(address user) external view returns (bool) {
        return _enrolled[user];
    }

    function _pull(address from, address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TifoTypes.TransferFailed();
        }
    }
}
