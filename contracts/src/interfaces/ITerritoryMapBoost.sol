// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ITerritoryMapBoost
/// @notice Interface used by MatchOracle to apply match-event power
///         surges to specific regions for a faction.
interface ITerritoryMapBoost {
    function applyMatchBoost(uint16 regionId, uint8 faction, uint256 boost) external;
}
