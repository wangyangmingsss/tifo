// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IWarChestBump
/// @notice Callback interface used by TerritoryMap to mirror rally
///         contributions into WarChest, providing the denominator
///         for post-season claim() settlement.
interface IWarChestBump {
    function bumpContribTotal(uint16 regionId, uint8 faction, uint256 amount) external;
}
