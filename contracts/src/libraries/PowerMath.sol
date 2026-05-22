// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title PowerMath
/// @notice Pure functions for decay and underdog bonus calculations.
library PowerMath {
    uint256 constant BPS = 10_000;

    /// @notice Decay `power` by `retentionBps` per hour since `lastUpdate`.
    ///         Iterates up to 168 hours (~1 week) to bound gas.
    /// @param power       The stored (pre-decay) power value.
    /// @param lastUpdate  Timestamp of last update.
    /// @param retentionBps Retention per hour in basis points (e.g. 9900 = 1% decay).
    /// @return The decayed power.
    function decay(
        uint256 power,
        uint64 lastUpdate,
        uint256 retentionBps
    ) internal view returns (uint256) {
        if (power == 0) return 0;
        uint256 elapsed = block.timestamp - lastUpdate;
        uint256 intervals = elapsed / 1 hours;
        if (intervals == 0) return power;
        // Cap iterations to 168 (one week) to prevent gas explosion on stale regions.
        if (intervals > 168) intervals = 168;
        for (uint256 i = 0; i < intervals; ) {
            power = (power * retentionBps) / BPS;
            unchecked { ++i; }
        }
        return power;
    }

    /// @notice Apply underdog bonus: the further behind the attacker is, the more
    ///         each unit of rally counts, up to `maxBonusBps`.
    /// @param amount        Raw token amount committed.
    /// @param attackerPower Attacker's current (decayed) power in the region.
    /// @param ownerPower    Owner's current (decayed) power in the region.
    /// @param maxBonusBps   Maximum bonus in basis points (e.g. 5000 = +50%).
    /// @return effective    The effective power contribution after bonus.
    function applyUnderdogBonus(
        uint256 amount,
        uint256 attackerPower,
        uint256 ownerPower,
        uint256 maxBonusBps
    ) internal pure returns (uint256 effective) {
        // If attacker is already ahead or equal, no bonus.
        if (attackerPower >= ownerPower || ownerPower == 0) {
            return amount;
        }
        // deficitBps = (ownerPower - attackerPower) * BPS / ownerPower
        uint256 deficitBps = ((ownerPower - attackerPower) * BPS) / ownerPower;
        if (deficitBps > maxBonusBps) deficitBps = maxBonusBps;
        effective = amount + (amount * deficitBps) / BPS;
    }
}
