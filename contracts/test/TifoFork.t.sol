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

    // ── 5. Additional wiring verification ───────────────────────────────

    function test_Fork_MapWiredToRegistry() public view {
        // TerritoryMap.registry() should point to FactionRegistry
        address wiredRegistry = address(map.registry());
        assertEq(wiredRegistry, REGISTRY_ADDR, "TerritoryMap.registry != FactionRegistry");
    }

    function test_Fork_WarChestUpdaterWired() public view {
        // WarChest.updater() should be TerritoryMap (for bumpContribTotal callback)
        assertEq(chest.updater(), MAP_ADDR, "WarChest.updater != TerritoryMap");
    }

    function test_Fork_WarChestTokenIsUSDT() public view {
        // WarChest.token() should point to MockUSDT
        assertEq(chest.token(), USDT_ADDR, "WarChest.token != MockUSDT");
    }

    function test_Fork_RegistryWiredToChest() public view {
        // FactionRegistry.warChest() should point to WarChest
        assertEq(registry.warChest(), CHEST_ADDR, "FactionRegistry.warChest != WarChest");
    }

    // ── 6. Defect flow on fork ──────────────────────────────────────────

    function test_Fork_DefectFlowAfterCapture() public {
        address fan1 = address(0xD1);
        address fan2 = address(0xD2);
        uint16 targetRegion = 198;
        uint8 faction0 = 0;
        uint8 faction1 = 1;

        // ── fan1: join faction 0, rally region 198 ──
        vm.startPrank(fan1);
        token.faucet();
        token.approve(MAP_ADDR, type(uint256).max);
        token.approve(REGISTRY_ADDR, type(uint256).max);
        registry.joinFaction(faction0);
        map.rally(targetRegion, 500e18);
        uint256 fan1ContribF0 = map.contribution(targetRegion, faction0, fan1);
        assertGt(fan1ContribF0, 0, "fan1 contribution under faction0 should be > 0");
        vm.stopPrank();

        // ── fan2: join faction 1, overwhelm region 198 to capture it ──
        vm.startPrank(fan2);
        token.faucet();
        token.approve(MAP_ADDR, type(uint256).max);
        token.approve(REGISTRY_ADDR, type(uint256).max);
        registry.joinFaction(faction1);
        // Rally a large amount to guarantee capture
        map.rally(targetRegion, 5_000e18);
        vm.stopPrank();

        // Verify faction 1 now owns the region
        (uint8 ownerFaction,,) = map.regions(targetRegion);
        assertEq(ownerFaction, faction1, "Faction 1 should own region after overwhelming rally");

        // ── fan1: switch to faction 1 and defect ──
        vm.startPrank(fan1);
        registry.joinFaction(faction1);
        assertEq(registry.factionOf(fan1), faction1, "fan1 should now be in faction 1");

        map.defect(targetRegion);

        // After defection: contribution under old faction should be zeroed
        uint256 fan1ContribF0After = map.contribution(targetRegion, faction0, fan1);
        assertEq(fan1ContribF0After, 0, "Contribution under old faction should be zeroed after defect");

        // Contribution under new faction should be > 0 (finder's reward credit)
        uint256 fan1ContribF1 = map.contribution(targetRegion, faction1, fan1);
        assertGt(fan1ContribF1, 0, "Contribution under new faction should be > 0 after defect");
        vm.stopPrank();
    }

    // ── 7. Effective power decay over time ──────────────────────────────

    function test_Fork_EffectivePowerDecays() public {
        address decayFan = address(0xDE);
        uint16 decayRegion = 197;
        uint8 decayFaction = 2;

        // Rally to inject power into the region
        vm.startPrank(decayFan);
        token.faucet();
        token.approve(MAP_ADDR, type(uint256).max);
        token.approve(REGISTRY_ADDR, type(uint256).max);
        registry.joinFaction(decayFaction);
        map.rally(decayRegion, 1_000e18);
        vm.stopPrank();

        // Read effective power immediately after rally
        uint256 powerBefore = map.effectivePower(decayRegion, decayFaction);
        assertGt(powerBefore, 0, "Power should be > 0 after rally");

        // Warp forward 2 hours -- decay should reduce power
        vm.warp(block.timestamp + 2 hours);

        uint256 powerAfter = map.effectivePower(decayRegion, decayFaction);
        assertLt(powerAfter, powerBefore, "Effective power should decrease after time passes");
    }
}
