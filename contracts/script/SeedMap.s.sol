// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MatchOracle} from "../src/MatchOracle.sol";
import {TerritoryMap} from "../src/TerritoryMap.sol";

/// @title SeedMap
/// @notice Gives each of the 48 factions an opening foothold so the genesis map
///         already looks like a world of nations (Brazil in South America, France
///         in Europe, ...) and expansion creates the drama.
/// @dev After Deploy.s.sol transfers TerritoryMap ownership to the MatchOracle,
///      the only path to write region power is MatchOracle.pushMatchEvent (which
///      calls map.applyMatchBoost as the map's owner). We exploit that here: each
///      faction's anchor region gets a WHISTLE "kickoff" boost = its starting power.
///      The deployer is the oracle operator, so it may push these events.
///
///      anchorRegionId[] MUST be filled from packages/config/factions.config.js so
///      factionId i is seeded at the GeoJSON region matching its ISO anchor. The
///      placeholder below maps faction i -> region i; replace with the real mapping
///      once the GeoJSON region index is finalized.
///
/// Run (by the deployer / oracle operator):
///   forge script script/SeedMap.s.sol:SeedMap \
///     --rpc-url https://testrpc.xlayer.tech \
///     --private-key $OPERATOR_PRIVATE_KEY --broadcast -vvv
contract SeedMap is Script {
    uint8 constant FACTION_COUNT = 48;
    uint256 constant STARTING_POWER = 1_000e18;

    function run() external {
        uint256 pk = vm.envUint("OPERATOR_PRIVATE_KEY");
        address oracleAddr = vm.envAddress("MATCH_ORACLE");
        MatchOracle oracle = MatchOracle(oracleAddr);

        // faction i -> its anchor region id. REPLACE with config-driven mapping.
        uint16[FACTION_COUNT] memory anchor = _anchorRegions();

        vm.startBroadcast(pk);

        for (uint8 f = 0; f < FACTION_COUNT; f++) {
            uint16[] memory regions = new uint16[](1);
            regions[0] = anchor[f];
            // WHISTLE event with an override boost == starting power. This makes the
            // faction the owner of its anchor region at genesis.
            oracle.pushMatchEvent(f, MatchOracle.EventType.WHISTLE, regions, STARTING_POWER);
        }

        vm.stopBroadcast();
        console2.log("Seeded anchor power for 48 factions, power each:", STARTING_POWER);
    }

    /// @dev Placeholder 1:1 mapping (faction i -> region i). Swap for the real
    ///      ISO-anchor -> GeoJSON-region-index table from factions.config.js.
    function _anchorRegions() internal pure returns (uint16[FACTION_COUNT] memory a) {
        for (uint16 i = 0; i < FACTION_COUNT; i++) {
            a[i] = i;
        }
    }
}
