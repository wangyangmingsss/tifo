// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ITerritoryMapView
/// @notice Read-only view into TerritoryMap state.
///         Used by WarChest for season settlement (reading territory
///         counts) and claim calculation (reading contributions).
interface ITerritoryMapView {
    function territoryCounts() external view returns (uint256[] memory);
    function regions(uint16 regionId)
        external view returns (uint8 ownerFaction, uint64 lastUpdate, uint16 captureCount);
    function contribution(uint16 regionId, uint8 faction, address user)
        external view returns (uint256);
    function regionCount() external view returns (uint16);
}
