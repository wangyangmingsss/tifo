// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IFactionRegistry
/// @notice Read-only view into faction enrollment state.
///         Called by TerritoryMap on every rally() to verify the caller
///         belongs to a faction and to determine which faction.
interface IFactionRegistry {
    function factionOf(address user) external view returns (uint8);
    function isEnrolled(address user) external view returns (bool);
}
