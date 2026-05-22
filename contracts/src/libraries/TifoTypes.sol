// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title TifoTypes
/// @notice Shared constants and custom errors for the TIFO protocol.
library TifoTypes {
    uint8 constant FACTION_COUNT = 48;
    uint8 constant NO_FACTION = 255;
    uint256 constant BPS = 10_000;

    error InvalidFaction(uint8 faction);
    error InvalidRegion(uint16 regionId);
    error NotEnrolled(address user);
    error AlreadyInFaction(uint8 faction);
    error ZeroAmount();
    error InsufficientPower();
    error NoDefectableContribution();
    error NotOperator();
    error SeasonNotActive();
    error SeasonAlreadySettled();
    error TransferFailed();
}
