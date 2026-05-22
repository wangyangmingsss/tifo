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

    /// @dev Real ISO-anchor -> GeoJSON-region-index mapping derived from
    ///      packages/config/factions.config.js and src/config/regionMapping.ts.
    ///      Each factionId maps to the sorted index of its anchor country's
    ///      ISO 3166-1 numeric code in the countries-110m.json feature list.
    function _anchorRegions() internal pure returns (uint16[FACTION_COUNT] memory a) {
        // CONMEBOL (0-5)
        a[0]  =   6; // ARG -> '032'
        a[1]  =  17; // BRA -> '076'
        a[2]  = 169; // URU -> '858'
        a[3]  =  34; // COL -> '170'
        a[4]  =  45; // ECU -> '218'
        a[5]  = 122; // PAR -> '600'
        // UEFA (6-19)
        a[6]  =  54; // FRA -> '250'
        a[7]  = 144; // ESP -> '724'
        a[8]  = 165; // ENG -> '826' (GBR)
        a[9]  =  61; // GER -> '276'
        a[10] = 126; // POR -> '620'
        a[11] = 111; // NED -> '528'
        a[12] =  38; // CRO -> '191'
        a[13] =  12; // BEL -> '056'
        a[14] =  78; // ITA -> '380'
        a[15] = 151; // SUI -> '756'
        a[16] =   8; // AUT -> '040'
        a[17] = 118; // NOR -> '578'
        a[18] = 125; // POL -> '616'
        a[19] =  41; // CZE -> '203'
        // CONCACAF (20-24)
        a[20] = 167; // USA -> '840'
        a[21] = 102; // MEX -> '484'
        a[22] =  27; // CAN -> '124'
        a[23] = 120; // PAN -> '591'
        a[24] =  68; // HAI -> '332'
        // CAF (25-34)
        a[25] = 106; // MAR -> '504'
        a[26] = 135; // SEN -> '686'
        a[27] =  62; // GHA -> '288'
        a[28] = 142; // RSA -> '710'
        a[29] =  79; // CIV -> '384'
        a[30] = 117; // NGA -> '566'
        a[31] =   3; // ALG -> '012'
        a[32] = 164; // EGY -> '818'
        a[33] = 177; // CPV -> '132' (reserved slot, not in 110m)
        a[34] =  36; // COD -> '180'
        // AFC (35-43)
        a[35] =  81; // JPN -> '392'
        a[36] =  86; // KOR -> '410'
        a[37] =   7; // AUS -> '036'
        a[38] = 134; // KSA -> '682'
        a[39] =  74; // IRN -> '364'
        a[40] = 130; // QAT -> '634'
        a[41] = 170; // UZB -> '860'
        a[42] =  83; // JOR -> '400'
        a[43] =  75; // IRQ -> '368'
        // OFC + misc (44-47)
        a[44] = 114; // NZL -> '554'
        a[45] =  80; // JAM -> '388'
        a[46] = 159; // TUR -> '792'
        a[47] = 158; // TUN -> '788'
    }
}
