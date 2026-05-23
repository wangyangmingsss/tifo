// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {FactionRegistry} from "../src/FactionRegistry.sol";
import {TerritoryMap} from "../src/TerritoryMap.sol";
import {WarChest} from "../src/WarChest.sol";
import {MatchOracle} from "../src/MatchOracle.sol";

/// @title TifoForkTest
/// @notice Fork tests against live X Layer Testnet deployments.
///         Verifies contract bytecode, wiring, and end-to-end rally→capture flow.
///         Run: forge test --fork-url https://testrpc.xlayer.tech -vvv --match-contract TifoForkTest
contract TifoForkTest is Test {
    // ── Deployed addresses (X Layer Testnet) ─────────────────────────────
    address constant USDT_ADDR     = 0x212E0207999B982b2F4B8f91cA421D94dc8438e3;
    address constant CHEST_ADDR    = 0x2E587e2E830D637B80e3a23db7001a92582f1352;
    address constant REGISTRY_ADDR = 0x80449696e9F2DBEBC7F154805320f49ae5aA6E23;
    address constant MAP_ADDR      = 0x4987CFAF2CA1650887786C83746CcEC4d4941331;
    address constant ORACLE_ADDR   = 0x57E585543940cCfAB71141d84A419C3F7872d5be;

    MockUSDT token;
    WarChest chest;
    FactionRegistry registry;
    TerritoryMap map;
    MatchOracle oracle;

    address fan = address(0xF4A9);

    function setUp() public {
        token    = MockUSDT(USDT_ADDR);
        chest    = WarChest(CHEST_ADDR);
        registry = FactionRegistry(REGISTRY_ADDR);
        map      = TerritoryMap(MAP_ADDR);
        oracle   = MatchOracle(ORACLE_ADDR);
    }

    // ── 1. Bytecode existence ────────────────────────────────────────────

    function test_Fork_ContractsHaveBytecode() public view {
        assertTrue(USDT_ADDR.code.length > 0,     "MockUSDT has no bytecode");
        assertTrue(CHEST_ADDR.code.length > 0,     "WarChest has no bytecode");
        assertTrue(REGISTRY_ADDR.code.length > 0,  "FactionRegistry has no bytecode");
        assertTrue(MAP_ADDR.code.length > 0,        "TerritoryMap has no bytecode");
        assertTrue(ORACLE_ADDR.code.length > 0,     "MatchOracle has no bytecode");
    }

    // ── 2. Wiring verification ───────────────────────────────────────────

    function test_Fork_WarChestWiredToMap() public view {
        // WarChest.map() should point to TerritoryMap
        address wiredMap = address(chest.map());
        assertEq(wiredMap, MAP_ADDR, "WarChest.map != TerritoryMap");
    }

    function test_Fork_OracleWiredToMap() public view {
        // MatchOracle.map() should point to TerritoryMap
        address wiredMap = address(oracle.map());
        assertEq(wiredMap, MAP_ADDR, "MatchOracle.map != TerritoryMap");
    }

    function test_Fork_MapOwnerIsOracle() public view {
        // TerritoryMap.owner() should be MatchOracle (transferred after deploy)
        assertEq(map.owner(), ORACLE_ADDR, "TerritoryMap.owner != MatchOracle");
    }

    function test_Fork_RegionsSeeded() public view {
        // Map should have 200 regions
        assertEq(map.regionCount(), 200, "Expected 200 regions");
    }

    function test_Fork_48FactionsConfigured() public view {
        // territoryCounts() should return array of length 48
        uint256[] memory counts = map.territoryCounts();
        assertEq(counts.length, 48, "Expected 48 factions in territoryCounts");
    }

    // ── 3. End-to-end flow: join → faucet → approve → rally → capture ──

    function test_Fork_JoinRallyCaptureFlow() public {
        // Use a fresh address to avoid state collision
        vm.startPrank(fan);

        // Faucet: get tokens
        token.faucet();
        uint256 bal = token.balanceOf(fan);
        assertGt(bal, 0, "Faucet should provide tokens");

        // Join faction 0 (Argentina)
        registry.joinFaction(0);
        assertTrue(registry.isEnrolled(fan), "Fan should be enrolled");
        assertEq(registry.factionOf(fan), 0, "Fan should be in faction 0");

        // Approve TerritoryMap to spend tokens
        token.approve(MAP_ADDR, type(uint256).max);

        // Find a neutral or weakly held region to rally
        // Region 199 is likely neutral or low-power
        uint256 rallyAmount = 500e18;
        map.rally(199, rallyAmount);

        // Verify contribution recorded
        uint256 contrib = map.contribution(199, 0, fan);
        assertGt(contrib, 0, "Contribution should be recorded");

        vm.stopPrank();
    }

    // ── 4. View functions work correctly on fork ─────────────────────────

    function test_Fork_GetMapStateReturns200() public view {
        uint8[] memory state = map.getMapState();
        assertEq(state.length, 200, "getMapState should return 200 entries");
    }

    function test_Fork_TerritoryCounts48Entries() public view {
        uint256[] memory counts = map.territoryCounts();
        assertEq(counts.length, 48, "territoryCounts should return 48 entries");

        // At least some factions should hold territory (seeded via SeedMap)
        uint256 totalOwned = 0;
        for (uint256 i = 0; i < 48; i++) {
            totalOwned += counts[i];
        }
        assertGt(totalOwned, 0, "At least some territories should be owned");
    }

    function test_Fork_MockUSDTMetadata() public view {
        assertEq(token.name(), "Mock USDT");
        assertEq(token.symbol(), "mUSDT");
        assertEq(token.decimals(), 18);
    }
}
