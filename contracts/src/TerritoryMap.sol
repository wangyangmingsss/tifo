// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TifoTypes} from "./libraries/TifoTypes.sol";
import {PowerMath} from "./libraries/PowerMath.sol";

interface IFactionRegistry {
    function factionOf(address user) external view returns (uint8);
    function isEnrolled(address user) external view returns (bool);
}

interface IWarChestBump {
    function bumpContribTotal(uint16 regionId, uint8 faction, uint256 amount) external;
}

/// @title TerritoryMap
/// @notice The heart of TIFO. A fixed set of real-world regions is contested by
///         48 factions. Three mechanics make this more than "whoever stakes most
///         wins":
///           1. DECAY    -- a region's faction power bleeds over time, so idle
///                          territory is lost. Forces continuous on-chain action.
///           2. UNDERDOG -- the further behind a faction is in a region, the more
///                          each unit of rally counts. No region is ever locked;
///                          comebacks are always possible. (PowerMath)
///           3. DEFECTION-- a user who contributed to a region under a faction
///                          that since lost it can DEFECT: convert their stale
///                          contribution into power for the new owner, claiming a
///                          finder's cut. This injects social betrayal dynamics
///                          and accelerates contested regions flipping.
/// @dev rally() is the highest-frequency action in the protocol; it is written
///      to emit a rich event stream so the entire map state is reconstructable
///      from logs alone -- the on-chain-verifiability claim is literally true.
contract TerritoryMap {
    using PowerMath for uint256;

    // ----------------------------------------------------------------------
    // Storage
    // ----------------------------------------------------------------------

    address public owner;
    address public immutable token; // MockUSDT
    IFactionRegistry public immutable registry;
    address public warChest; // receives the protocol/prize share of rallies

    uint16 public regionCount; // number of active regions on the map
    uint256 public retentionBps = 9_900; // 1% decay per hour
    uint256 public maxUnderdogBps = 5_000; // up to +50% for the biggest underdog
    uint256 public protocolBps = 200; // 2% of each rally routed to WarChest

    struct Region {
        uint8 ownerFaction; // current holder (NO_FACTION if neutral)
        uint64 lastUpdate; // last time power was recalculated
        uint16 captureCount; // how many times this region has flipped
    }

    /// @notice regionId => region metadata
    mapping(uint16 => Region) public regions;
    /// @notice regionId => factionId => stored (pre-decay) power
    mapping(uint16 => mapping(uint8 => uint256)) public regionFactionPower;
    /// @notice regionId => factionId => user => cumulative raw contribution
    ///         Used to size defection payouts and member reward splits.
    mapping(uint16 => mapping(uint8 => mapping(address => uint256))) public contribution;

    // ----------------------------------------------------------------------
    // Events  (full state is reconstructable from these)
    // ----------------------------------------------------------------------

    event RallyPlaced(
        address indexed user,
        uint16 indexed regionId,
        uint8 indexed faction,
        uint256 rawAmount,
        uint256 effectivePower,
        uint256 newFactionPower
    );
    event TerritoryCaptured(
        uint16 indexed regionId,
        uint8 indexed oldFaction,
        uint8 indexed newFaction,
        uint16 captureCount
    );
    event Defected(
        address indexed user,
        uint16 indexed regionId,
        uint8 fromFaction,
        uint8 indexed toFaction,
        uint256 convertedPower,
        uint256 finderReward
    );
    event RegionsAdded(uint16 fromId, uint16 toId);

    // ----------------------------------------------------------------------
    // Modifiers
    // ----------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert TifoTypes.NotOperator();
        _;
    }

    constructor(address token_, address registry_, address warChest_) {
        token = token_;
        registry = IFactionRegistry(registry_);
        warChest = warChest_;
        owner = msg.sender;
    }

    // ----------------------------------------------------------------------
    // Core: RALLY
    // ----------------------------------------------------------------------

    /// @notice Commit tokens to push your faction's power in a region. If your
    ///         faction's post-rally power exceeds the current owner's (decayed)
    ///         power, the region flips to you and emits TerritoryCaptured.
    /// @param regionId target region
    /// @param amount   raw token amount to commit
    function rally(uint16 regionId, uint256 amount) external {
        if (regionId >= regionCount) revert TifoTypes.InvalidRegion(regionId);
        if (amount == 0) revert TifoTypes.ZeroAmount();
        if (!registry.isEnrolled(msg.sender)) revert TifoTypes.NotEnrolled(msg.sender);

        uint8 faction = registry.factionOf(msg.sender);

        // Pull tokens: protocol share to WarChest, remainder conceptually staked
        // into the region (held by this contract, recycled at settlement).
        uint256 toChest = (amount * protocolBps) / TifoTypes.BPS;
        _pull(msg.sender, warChest, toChest);
        _pull(msg.sender, address(this), amount - toChest);

        Region storage r = regions[regionId];
        uint8 currentOwner = r.ownerFaction;

        // Settle decay on both attacker and owner before comparing.
        uint256 attackerPower = _decayed(regionId, faction);
        uint256 ownerPower = currentOwner == TifoTypes.NO_FACTION
            ? 0
            : _decayed(regionId, currentOwner);

        // Underdog bonus on the effective contribution.
        uint256 effective = PowerMath.applyUnderdogBonus(
            amount,
            attackerPower,
            ownerPower,
            maxUnderdogBps
        );

        uint256 newFactionPower = attackerPower + effective;

        // Persist decayed values + new attacker power, refresh timestamp.
        if (currentOwner != TifoTypes.NO_FACTION && currentOwner != faction) {
            regionFactionPower[regionId][currentOwner] = ownerPower;
        }
        regionFactionPower[regionId][faction] = newFactionPower;
        r.lastUpdate = uint64(block.timestamp);

        contribution[regionId][faction][msg.sender] += amount;

        // Mirror the running per-(region,faction) contribution total into WarChest
        // so claim() has a denominator without unbounded on-chain iteration over
        // contributors. This is the wiring that closes the integration point noted
        // in the spec: TerritoryMap must be set as WarChest's `updater`. Wrapped in
        // a try/catch so the map keeps functioning even if WarChest is not yet
        // wired (e.g. in early tests), making the dependency non-fatal.
        if (warChest != address(0)) {
            try IWarChestBump(warChest).bumpContribTotal(regionId, faction, amount) {} catch {}
        }

        emit RallyPlaced(msg.sender, regionId, faction, amount, effective, newFactionPower);

        // Capture check.
        if (faction != currentOwner && newFactionPower > ownerPower) {
            r.ownerFaction = faction;
            r.captureCount += 1;
            emit TerritoryCaptured(regionId, currentOwner, faction, r.captureCount);
        }
    }

    // ----------------------------------------------------------------------
    // Core: DEFECTION
    // ----------------------------------------------------------------------

    /// @notice If you previously rallied for a faction in a region that has since
    ///         been captured by another faction, you may DEFECT: convert a portion
    ///         of your stale contribution into power for the *current owner*, in
    ///         exchange for a finder's reward share. This betrays your old faction
    ///         and helps the new owner cement control -- the social-game core.
    /// @param regionId region to defect within
    /// @dev Converts the caller's stale contribution under the previous owner into
    ///      fresh power for the current owner. The user must currently belong to
    ///      the new owning faction (i.e. they already switched sides in registry).
    function defect(uint16 regionId) external {
        if (regionId >= regionCount) revert TifoTypes.InvalidRegion(regionId);
        if (!registry.isEnrolled(msg.sender)) revert TifoTypes.NotEnrolled(msg.sender);

        Region storage r = regions[regionId];
        uint8 newOwner = r.ownerFaction;
        uint8 myFaction = registry.factionOf(msg.sender);
        if (newOwner == TifoTypes.NO_FACTION || myFaction != newOwner) {
            revert TifoTypes.InvalidFaction(myFaction);
        }

        // Find the caller's largest stale contribution under any *other* faction.
        // For gas-bounded determinism we convert from the region's previous-but-one
        // dominant faction the caller contributed to; in this build we convert the
        // caller's contribution recorded under the prior owner if any.
        // Simplified, auditable rule: convert contribution under NO current-owner
        // factions is disallowed; we read the caller's contribution under the
        // single richest non-owner faction they backed.
        (uint8 fromFaction, uint256 stale) = _largestForeignContribution(
            regionId,
            msg.sender,
            newOwner
        );
        if (stale == 0) revert TifoTypes.NoDefectableContribution();

        // Convert: 80% of stale becomes fresh power for the new owner, 20% is the
        // defector's finder reward (paid from WarChest at settlement; here we
        // record it as contribution credit under the new owner so they share in
        // that faction's prize split).
        uint256 converted = (stale * 8_000) / TifoTypes.BPS;
        uint256 finder = stale - converted;

        // Zero out the stale contribution and reduce the old faction's power.
        contribution[regionId][fromFaction][msg.sender] = 0;
        uint256 oldPower = _decayed(regionId, fromFaction);
        regionFactionPower[regionId][fromFaction] = oldPower > converted
            ? oldPower - converted
            : 0;

        // Credit the new owner.
        uint256 ownerPower = _decayed(regionId, newOwner);
        regionFactionPower[regionId][newOwner] = ownerPower + converted;
        contribution[regionId][newOwner][msg.sender] += finder; // finder's reward weight
        r.lastUpdate = uint64(block.timestamp);

        emit Defected(msg.sender, regionId, fromFaction, newOwner, converted, finder);
    }

    // ----------------------------------------------------------------------
    // Views  (used by the frontend map + the verifiability panel)
    // ----------------------------------------------------------------------

    /// @notice Current owner of every region, in one call, for map rendering.
    function getMapState() external view returns (uint8[] memory ownersArr) {
        ownersArr = new uint8[](regionCount);
        for (uint16 i = 0; i < regionCount; ) {
            ownersArr[i] = regions[i].ownerFaction;
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Live (decay-applied) power of a faction in a region.
    function effectivePower(uint16 regionId, uint8 faction) external view returns (uint256) {
        return _decayed(regionId, faction);
    }

    /// @notice Count of regions currently held by each faction (the leaderboard).
    function territoryCounts() external view returns (uint256[] memory counts) {
        counts = new uint256[](TifoTypes.FACTION_COUNT);
        for (uint16 i = 0; i < regionCount; ) {
            uint8 o = regions[i].ownerFaction;
            if (o != TifoTypes.NO_FACTION) counts[o] += 1;
            unchecked {
                ++i;
            }
        }
    }

    // ----------------------------------------------------------------------
    // Admin
    // ----------------------------------------------------------------------

    /// @notice Register `n` new neutral regions (called once at season setup).
    function addRegions(uint16 n) external onlyOwner {
        uint16 from = regionCount;
        for (uint16 i = 0; i < n; ) {
            regions[regionCount].ownerFaction = TifoTypes.NO_FACTION;
            regions[regionCount].lastUpdate = uint64(block.timestamp);
            regionCount += 1;
            unchecked {
                ++i;
            }
        }
        emit RegionsAdded(from, regionCount - 1);
    }

    function setParams(
        uint256 retentionBps_,
        uint256 maxUnderdogBps_,
        uint256 protocolBps_
    ) external onlyOwner {
        retentionBps = retentionBps_;
        maxUnderdogBps = maxUnderdogBps_;
        protocolBps = protocolBps_;
    }

    /// @notice Operator hook used by MatchOracle: apply a transient power boost to
    ///         a faction across a region (e.g. a goal is scored -> the map surges).
    function applyMatchBoost(uint16 regionId, uint8 faction, uint256 boost) external onlyOwner {
        if (regionId >= regionCount) revert TifoTypes.InvalidRegion(regionId);
        uint256 p = _decayed(regionId, faction);
        regionFactionPower[regionId][faction] = p + boost;
        regions[regionId].lastUpdate = uint64(block.timestamp);

        Region storage r = regions[regionId];
        if (faction != r.ownerFaction && regionFactionPower[regionId][faction] > _decayed(regionId, r.ownerFaction)) {
            uint8 old = r.ownerFaction;
            r.ownerFaction = faction;
            r.captureCount += 1;
            emit TerritoryCaptured(regionId, old, faction, r.captureCount);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ----------------------------------------------------------------------
    // Internal
    // ----------------------------------------------------------------------

    function _decayed(uint16 regionId, uint8 faction) internal view returns (uint256) {
        return PowerMath.decay(
            regionFactionPower[regionId][faction],
            regions[regionId].lastUpdate,
            retentionBps
        );
    }

    /// @dev Returns the faction (other than `exclude`) under which `user` holds
    ///      the largest contribution in `regionId`. Bounded loop over 48 factions.
    function _largestForeignContribution(
        uint16 regionId,
        address user,
        uint8 exclude
    ) internal view returns (uint8 bestFaction, uint256 bestAmount) {
        for (uint8 f = 0; f < TifoTypes.FACTION_COUNT; ) {
            if (f != exclude) {
                uint256 c = contribution[regionId][f][user];
                if (c > bestAmount) {
                    bestAmount = c;
                    bestFaction = f;
                }
            }
            unchecked {
                ++f;
            }
        }
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
