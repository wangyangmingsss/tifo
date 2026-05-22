// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title PowerMath
/// @notice Pure functions for decay and underdog bonus calculations.
/// @dev Used by TerritoryMap to make territory control dynamic:
///      - Decay: idle territory bleeds power over time, forcing continuous action.
///      - Underdog bonus: the further behind, the more each unit of rally counts.
library PowerMath {
    /// @notice Apply hourly decay to stored power.
    /// @param power     The stored (pre-decay) power value.
    /// @param lastUpdate Timestamp of the last power update.
    /// @param retentionBps Retention per hour in basis points (e.g. 9900 = 99% retained = 1% decay).
    /// @return The decayed power value.
    /// @dev Iterates once per elapsed hour, capped at 168 iterations (~1 week)
    ///      to prevent gas explosion on long-idle regions.
    function decay(
        uint256 power,
        uint64 lastUpdate,
        uint256 retentionBps
    ) internal view returns (uint256) {
        if (power == 0) return 0;
        uint256 elapsed = block.timestamp - lastUpdate;
        uint256 intervals = elapsed / 1 hours;
        if (intervals == 0) return power;
        if (intervals > 168) intervals = 168;
        for (uint256 i = 0; i < intervals; ) {
            power = (power * retentionBps) / 10_000;
            unchecked {
                ++i;
            }
        }
        return power;
    }

    /// @notice Calculate effective power with underdog bonus.
    /// @param amount        Raw contribution amount.
    /// @param attackerPower Current (decayed) power of the attacking faction.
    /// @param ownerPower    Current (decayed) power of the defending/owning faction.
    /// @param maxBonusBps   Maximum bonus in basis points (e.g. 5000 = +50%).
    /// @return The effective power contribution (amount + bonus if underdog).
    /// @dev If attacker is ahead or owner has no power, no bonus is applied.
    ///      Otherwise bonus = amount * min(deficitBps, maxBonusBps) / BPS.
    function applyUnderdogBonus(
        uint256 amount,
        uint256 attackerPower,
        uint256 ownerPower,
        uint256 maxBonusBps
    ) internal pure returns (uint256) {
        if (attackerPower >= ownerPower || ownerPower == 0) return amount;
        uint256 deficitBps = ((ownerPower - attackerPower) * 10_000) / ownerPower;
        if (deficitBps > maxBonusBps) deficitBps = maxBonusBps;
        return amount + (amount * deficitBps) / 10_000;
    }
}
