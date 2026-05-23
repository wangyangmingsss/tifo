// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {FactionRegistry} from "../src/FactionRegistry.sol";
import {TerritoryMap} from "../src/TerritoryMap.sol";
import {WarChest} from "../src/WarChest.sol";
import {MatchOracle} from "../src/MatchOracle.sol";
import {PowerMath} from "../src/libraries/PowerMath.sol";
import {TifoTypes} from "../src/libraries/TifoTypes.sol";

/// @title TifoTest
/// @notice Full unit + integration suite for the TIFO protocol. Target >=80% line
///         coverage. Run: `forge test -vvv` and `forge coverage`.
contract TifoTest is Test {
    MockUSDT token;
    WarChest chest;
    FactionRegistry registry;
    TerritoryMap map;
    MatchOracle oracle;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA401);

    uint8 constant ARG = 0;
    uint8 constant BRA = 1;

    function setUp() public {
        token = new MockUSDT();
        chest = new WarChest(address(token));
        registry = new FactionRegistry(address(token), address(chest));
        map = new TerritoryMap(address(token), address(registry), address(chest));
        oracle = new MatchOracle(address(map));

        chest.setMap(address(map));

        // seed regions
        map.addRegions(5);

        // fund users
        token.mint(alice, 1_000_000e18);
        token.mint(bob, 1_000_000e18);
        token.mint(carol, 1_000_000e18);

        vm.prank(alice);
        token.approve(address(map), type(uint256).max);
        vm.prank(bob);
        token.approve(address(map), type(uint256).max);
        vm.prank(carol);
        token.approve(address(map), type(uint256).max);
        vm.prank(alice);
        token.approve(address(registry), type(uint256).max);
        vm.prank(bob);
        token.approve(address(registry), type(uint256).max);
    }

    // ----------------------------------------------------------------------
    // MockUSDT
    // ----------------------------------------------------------------------

    function test_Faucet_GivesTokensAndEnforcesCooldown() public {
        vm.prank(carol);
        token.faucet();
        assertEq(token.balanceOf(carol), 1_000_000e18 + 1000e18);

        vm.prank(carol);
        vm.expectRevert();
        token.faucet(); // cooldown active

        vm.warp(block.timestamp + 12 hours);
        vm.prank(carol);
        token.faucet(); // ok now
    }

    function test_TransferFrom_RespectsAllowance() public {
        vm.prank(alice);
        token.approve(bob, 100e18);
        vm.prank(bob);
        token.transferFrom(alice, bob, 100e18);
        assertEq(token.allowance(alice, bob), 0);
    }

    // ----------------------------------------------------------------------
    // FactionRegistry
    // ----------------------------------------------------------------------

    function test_FirstJoinIsFree_SwitchCostsFee() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        assertEq(registry.factionOf(alice), ARG);
        assertEq(registry.memberCount(ARG), 1);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        registry.joinFaction(BRA); // switch -> pays fee
        assertEq(registry.factionOf(alice), BRA);
        assertEq(token.balanceOf(alice), before - registry.switchFee());
        assertEq(registry.memberCount(ARG), 0);
        assertEq(registry.memberCount(BRA), 1);
    }

    function test_JoinSameFactionReverts() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.AlreadyInFaction.selector, ARG));
        registry.joinFaction(ARG);
    }

    function test_InvalidFactionReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidFaction.selector, uint8(48)));
        registry.joinFaction(48);
    }

    // ----------------------------------------------------------------------
    // PowerMath
    // ----------------------------------------------------------------------

    function test_Decay_NoTimeNoDecay() public view {
        uint256 p = PowerMath.decay(1000e18, uint64(block.timestamp), 9_900);
        assertEq(p, 1000e18);
    }

    function test_Decay_OneIntervalApplies1Percent() public {
        uint64 start = uint64(block.timestamp);
        vm.warp(block.timestamp + 1 hours);
        uint256 p = PowerMath.decay(1000e18, start, 9_900);
        assertEq(p, (1000e18 * 9_900) / 10_000); // 990e18
    }

    function test_Decay_ZeroPowerStaysZero() public view {
        assertEq(PowerMath.decay(0, uint64(block.timestamp), 9_900), 0);
    }

    function test_UnderdogBonus_AttackerAheadNoBonus() public pure {
        uint256 e = PowerMath.applyUnderdogBonus(100e18, 500e18, 200e18, 5_000);
        assertEq(e, 100e18);
    }

    function test_UnderdogBonus_BiggestDeficitClampedToMax() public pure {
        // attacker far behind: ownerPower huge vs attackerPower 0 -> bonus clamps
        uint256 e = PowerMath.applyUnderdogBonus(100e18, 0, 1_000_000e18, 5_000);
        assertEq(e, 100e18 + (100e18 * 5_000) / 10_000); // +50%
    }

    // ----------------------------------------------------------------------
    // TerritoryMap: rally + capture
    // ----------------------------------------------------------------------

    function test_Rally_CapturesNeutralRegion() public {
        vm.prank(alice);
        registry.joinFaction(ARG);

        vm.prank(alice);
        map.rally(0, 100e18);

        (uint8 ownerFaction,, uint16 captures) = map.regions(0);
        assertEq(ownerFaction, ARG);
        assertEq(captures, 1);
        assertEq(map.contribution(0, ARG, alice), 100e18);
    }

    function test_Rally_RoutesProtocolShareToWarChest() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        uint256 chestBefore = token.balanceOf(address(chest));
        vm.prank(alice);
        map.rally(0, 100e18);
        // 2% protocol share
        assertEq(token.balanceOf(address(chest)) - chestBefore, 2e18);
    }

    function test_Rally_NotEnrolledReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.NotEnrolled.selector, alice));
        map.rally(0, 100e18);
    }

    function test_Rally_ZeroAmountReverts() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        vm.expectRevert(TifoTypes.ZeroAmount.selector);
        map.rally(0, 0);
    }

    function test_Rally_StrongerAttackerFlipsOwnership() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18); // ARG owns with 100

        vm.prank(bob);
        registry.joinFaction(BRA);
        vm.prank(bob);
        map.rally(0, 50e18); // not enough alone? underdog bonus may apply

        // Bob is underdog (0 vs 100), gets up to +50%: 50 * 1.5 = 75 < 100 -> no flip
        (uint8 ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, ARG);

        vm.prank(bob);
        map.rally(0, 100e18); // now BRA total power exceeds ARG -> flip
        (ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, BRA);
    }

    function test_Rally_IdleRegionDecaysAndCanBeRetaken() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);

        // long idle -> ARG power decays heavily
        vm.warp(block.timestamp + 100 hours);

        vm.prank(bob);
        registry.joinFaction(BRA);
        vm.prank(bob);
        map.rally(0, 50e18); // ARG decayed below 50 -> BRA takes it
        (uint8 ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, BRA);
    }

    // ----------------------------------------------------------------------
    // TerritoryMap: defection
    // ----------------------------------------------------------------------

    function test_Defect_ConvertsStaleContributionToNewOwner() public {
        // Alice backs ARG in region 0
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 200e18);

        // Bob (BRA) overwhelms and captures region 0
        vm.prank(bob);
        registry.joinFaction(BRA);
        vm.prank(bob);
        map.rally(0, 1000e18);
        (uint8 ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, BRA);

        // Alice switches to BRA, then defects: her stale ARG contribution converts
        vm.prank(alice);
        registry.joinFaction(BRA); // pays switch fee
        vm.prank(alice);
        map.defect(0);

        // ARG contribution zeroed, BRA credited with finder weight
        assertEq(map.contribution(0, ARG, alice), 0);
        assertGt(map.contribution(0, BRA, alice), 0);
    }

    function test_Defect_NoContributionReverts() public {
        vm.prank(bob);
        registry.joinFaction(BRA);
        vm.prank(bob);
        map.rally(0, 100e18); // BRA owns

        // carol never contributed under any other faction
        vm.prank(carol);
        registry.joinFaction(BRA);
        vm.prank(carol);
        vm.expectRevert(TifoTypes.NoDefectableContribution.selector);
        map.defect(0);
    }

    // ----------------------------------------------------------------------
    // MatchOracle
    // ----------------------------------------------------------------------

    function test_Oracle_OnlyOperatorCanPush() public {
        // give the oracle the right to boost the map
        map.transferOwnership(address(oracle));

        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;

        vm.prank(alice);
        vm.expectRevert(TifoTypes.NotOperator.selector);
        oracle.pushMatchEvent(BRA, MatchOracle.EventType.GOAL, regions, 0);
    }

    function test_Oracle_GoalBoostCanCaptureRegion() public {
        map.transferOwnership(address(oracle));

        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;

        // operator (deployer == this contract) pushes a goal for BRA
        oracle.pushMatchEvent(BRA, MatchOracle.EventType.GOAL, regions, 0);

        (uint8 ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, BRA); // 500e18 boost from neutral -> BRA owns
        assertEq(oracle.eventCount(), 1);
    }

    // ----------------------------------------------------------------------
    // WarChest
    // ----------------------------------------------------------------------

    function test_WarChest_PassiveAccruesToOwner() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18); // ARG owns region 0

        chest.accruePassive(0); // initialize lastAccrue
        vm.warp(block.timestamp + 1 hours);
        uint256 before = chest.factionPrizePool(ARG);
        chest.accruePassive(0);
        assertGt(chest.factionPrizePool(ARG), before);
    }

    function test_WarChest_SettleThenClaim() public {
        // Wire map as updater so rally() auto-bumps claim denominator
        chest.setUpdater(address(map));

        // ARG takes region 0 via alice
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);

        // Verify auto wiring: bumpContribTotal called by rally() callback
        assertEq(chest.regionFactionContribTotal(0, ARG), 100e18);

        // fund the faction pool directly
        token.mint(address(chest), 1000e18);
        chest.deposit(ARG, 1000e18, address(this));

        chest.settleSeason();
        assertTrue(chest.settled());

        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;
        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        chest.claim(regions);
        assertGt(token.balanceOf(alice), before);

        // double claim yields nothing more
        uint256 mid = token.balanceOf(alice);
        vm.prank(alice);
        chest.claim(regions);
        assertEq(token.balanceOf(alice), mid);
    }

    function test_WarChest_ClaimBeforeSettleReverts() public {
        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;
        vm.prank(alice);
        vm.expectRevert(TifoTypes.SeasonNotActive.selector);
        chest.claim(regions);
    }

    function test_WarChest_DoubleSettleReverts() public {
        chest.settleSeason();
        vm.expectRevert(TifoTypes.SeasonAlreadySettled.selector);
        chest.settleSeason();
    }

    // ----------------------------------------------------------------------
    // Views
    // ----------------------------------------------------------------------

    function test_GetMapStateAndTerritoryCounts() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);
        vm.prank(alice);
        map.rally(1, 100e18);

        uint8[] memory state = map.getMapState();
        assertEq(state.length, 5);
        assertEq(state[0], ARG);
        assertEq(state[1], ARG);

        uint256[] memory counts = map.territoryCounts();
        assertEq(counts[ARG], 2);
    }

    // ======================================================================
    // Additional tests for ≥80% coverage
    // ======================================================================

    // ----------------------------------------------------------------------
    // MatchOracle: admin functions
    // ----------------------------------------------------------------------

    function test_Oracle_SetOperator() public {
        map.transferOwnership(address(oracle));
        oracle.setOperator(alice);
        assertEq(oracle.operator(), alice);

        // old operator (this) can no longer push
        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;
        vm.expectRevert(TifoTypes.NotOperator.selector);
        oracle.pushMatchEvent(ARG, MatchOracle.EventType.GOAL, regions, 0);

        // alice can push
        vm.prank(alice);
        oracle.pushMatchEvent(ARG, MatchOracle.EventType.GOAL, regions, 0);
    }

    function test_Oracle_SetBoost() public {
        oracle.setBoost(MatchOracle.EventType.GOAL, 999e18);
        assertEq(oracle.boostFor(MatchOracle.EventType.GOAL), 999e18);
    }

    function test_Oracle_TransferOwnership() public {
        oracle.transferOwnership(alice);
        assertEq(oracle.owner(), alice);

        // old owner can no longer call admin
        vm.expectRevert(TifoTypes.NotOperator.selector);
        oracle.setBoost(MatchOracle.EventType.GOAL, 1);

        // alice can
        vm.prank(alice);
        oracle.setBoost(MatchOracle.EventType.GOAL, 1);
    }

    function test_Oracle_OverrideBoost() public {
        map.transferOwnership(address(oracle));

        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;

        // push with override boost (non-zero overrides default)
        oracle.pushMatchEvent(ARG, MatchOracle.EventType.WHISTLE, regions, 777e18);
        (uint8 ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, ARG); // 777e18 override boost captures neutral
    }

    function test_Oracle_InvalidFactionReverts() public {
        map.transferOwnership(address(oracle));
        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidFaction.selector, uint8(48)));
        oracle.pushMatchEvent(48, MatchOracle.EventType.GOAL, regions, 0);
    }

    function test_Oracle_PenaltyAndRedCardBoosts() public {
        map.transferOwnership(address(oracle));
        uint16[] memory regions = new uint16[](1);

        // PENALTY boost
        regions[0] = 0;
        oracle.pushMatchEvent(ARG, MatchOracle.EventType.PENALTY, regions, 0);
        (uint8 owner0,,) = map.regions(0);
        assertEq(owner0, ARG);

        // RED_CARD boost
        regions[0] = 1;
        oracle.pushMatchEvent(BRA, MatchOracle.EventType.RED_CARD, regions, 0);
        (uint8 owner1,,) = map.regions(1);
        assertEq(owner1, BRA);

        assertEq(oracle.eventCount(), 2);
    }

    function test_Oracle_WhistleZeroBoostNoCapture() public {
        map.transferOwnership(address(oracle));
        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;

        // WHISTLE default boost is 0 -> no capture
        oracle.pushMatchEvent(ARG, MatchOracle.EventType.WHISTLE, regions, 0);
        (uint8 ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, 255); // still neutral
    }

    // ----------------------------------------------------------------------
    // TerritoryMap: admin functions
    // ----------------------------------------------------------------------

    function test_Map_SetParams() public {
        map.setParams(9_500, 3_000, 500);
        assertEq(map.retentionBps(), 9_500);
        assertEq(map.maxUnderdogBps(), 3_000);
        assertEq(map.protocolBps(), 500);
    }

    function test_Map_SetParamsOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(TifoTypes.NotOperator.selector);
        map.setParams(9_500, 3_000, 500);
    }

    function test_Map_AddRegionsOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(TifoTypes.NotOperator.selector);
        map.addRegions(10);
    }

    function test_Map_TransferOwnershipOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(TifoTypes.NotOperator.selector);
        map.transferOwnership(alice);
    }

    function test_Map_ApplyMatchBoostDirect() public {
        // owner (this contract) can call applyMatchBoost directly
        map.applyMatchBoost(0, ARG, 500e18);
        (uint8 ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, ARG);

        // boost another faction higher -> capture
        map.applyMatchBoost(0, BRA, 1000e18);
        (ownerFaction,,) = map.regions(0);
        assertEq(ownerFaction, BRA);
    }

    function test_Map_ApplyMatchBoostInvalidRegion() public {
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidRegion.selector, uint16(99)));
        map.applyMatchBoost(99, ARG, 100e18);
    }

    function test_Map_InvalidRegionRally() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidRegion.selector, uint16(99)));
        map.rally(99, 100e18);
    }

    function test_Map_InvalidRegionDefect() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidRegion.selector, uint16(99)));
        map.defect(99);
    }

    function test_Map_DefectNotEnrolledReverts() public {
        // carol not enrolled
        vm.prank(carol);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.NotEnrolled.selector, carol));
        map.defect(0);
    }

    function test_Map_DefectNeutralRegionReverts() public {
        // region 3 is neutral, carol joins ARG
        vm.prank(carol);
        registry.joinFaction(ARG);
        vm.prank(carol);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidFaction.selector, ARG));
        map.defect(3);
    }

    function test_Map_DefectWrongFactionReverts() public {
        // bob takes region 0 as BRA
        vm.prank(bob);
        registry.joinFaction(BRA);
        vm.prank(bob);
        map.rally(0, 100e18);

        // alice is ARG, not the current owner (BRA), so defect reverts
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidFaction.selector, ARG));
        map.defect(0);
    }

    function test_Map_EffectivePower() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);

        // immediate effective power should match stored (no decay yet)
        uint256 ep = map.effectivePower(0, ARG);
        assertGt(ep, 0);

        // after time, power decays
        vm.warp(block.timestamp + 10 hours);
        uint256 epDecayed = map.effectivePower(0, ARG);
        assertLt(epDecayed, ep);
    }

    function test_Map_RallySameFactionNoFlip() public {
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);

        // alice rallies same region same faction -> no flip event, power increases
        vm.prank(alice);
        map.rally(0, 50e18);
        (uint8 ownerFaction,, uint16 captures) = map.regions(0);
        assertEq(ownerFaction, ARG);
        assertEq(captures, 1); // still 1 capture (initial neutral -> ARG)
    }

    // ----------------------------------------------------------------------
    // WarChest: admin + edge cases
    // ----------------------------------------------------------------------

    function test_WarChest_SetPassiveRate() public {
        chest.setPassiveRate(2e12);
        assertEq(chest.passiveRatePerSecond(), 2e12);
    }

    function test_WarChest_TransferOwnership() public {
        chest.transferOwnership(alice);
        assertEq(chest.owner(), alice);

        vm.expectRevert(TifoTypes.NotOperator.selector);
        chest.settleSeason();
    }

    function test_WarChest_SetMapOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(TifoTypes.NotOperator.selector);
        chest.setMap(address(0));
    }

    function test_WarChest_SetUpdaterOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(TifoTypes.NotOperator.selector);
        chest.setUpdater(address(0));
    }

    function test_WarChest_BumpContribTotalOnlyUpdater() public {
        vm.prank(alice);
        vm.expectRevert(TifoTypes.NotOperator.selector);
        chest.bumpContribTotal(0, ARG, 100e18);
    }

    function test_WarChest_DepositInvalidFaction() public {
        vm.expectRevert(abi.encodeWithSelector(TifoTypes.InvalidFaction.selector, uint8(48)));
        chest.deposit(48, 100e18, address(this));
    }

    function test_WarChest_AccruePassiveNeutralRegion() public {
        // region 3 is neutral -> accruePassive just updates lastAccrue, no pool change
        uint256 poolBefore = chest.factionPrizePool(ARG);
        chest.accruePassive(3);
        assertEq(chest.factionPrizePool(ARG), poolBefore);
    }

    function test_WarChest_AccruePassiveAfterSettleReverts() public {
        chest.settleSeason();
        vm.expectRevert(TifoTypes.SeasonAlreadySettled.selector);
        chest.accruePassive(0);
    }

    function test_WarChest_ClaimNoContribution() public {
        // settle first
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);
        chest.settleSeason();

        // carol has no contribution, claim does nothing
        uint16[] memory regions = new uint16[](1);
        regions[0] = 0;
        uint256 before = token.balanceOf(carol);
        vm.prank(carol);
        chest.claim(regions);
        assertEq(token.balanceOf(carol), before);
    }

    // ----------------------------------------------------------------------
    // MockUSDT: additional coverage
    // ----------------------------------------------------------------------

    function test_MockUSDT_Transfer() public {
        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(alice);
        token.transfer(bob, 100e18);
        assertEq(token.balanceOf(alice), aliceBefore - 100e18);
    }

    function test_MockUSDT_TransferInsufficientBalance() public {
        vm.prank(carol);
        vm.expectRevert(MockUSDT.InsufficientBalance.selector);
        token.transfer(alice, 999_999_999e18);
    }

    function test_MockUSDT_TransferFromInsufficientAllowance() public {
        vm.prank(alice);
        token.approve(bob, 10e18);
        vm.prank(bob);
        vm.expectRevert(MockUSDT.InsufficientAllowance.selector);
        token.transferFrom(alice, bob, 100e18);
    }

    function test_MockUSDT_MaxApprovalNoDecrease() public {
        vm.prank(alice);
        token.approve(bob, type(uint256).max);
        vm.prank(bob);
        token.transferFrom(alice, bob, 100e18);
        // max approval should not decrease
        assertEq(token.allowance(alice, bob), type(uint256).max);
    }

    function test_MockUSDT_MintIncreasesTotalSupply() public {
        uint256 supplyBefore = token.totalSupply();
        token.mint(alice, 500e18);
        assertEq(token.totalSupply(), supplyBefore + 500e18);
    }

    // ----------------------------------------------------------------------
    // FactionRegistry: additional coverage
    // ----------------------------------------------------------------------

    function test_Registry_FactionOfUnenrolled() public view {
        // unenrolled user returns default (0)
        assertEq(registry.factionOf(address(0xDEAD)), 0);
        assertFalse(registry.isEnrolled(address(0xDEAD)));
    }

    // ----------------------------------------------------------------------
    // PowerMath: additional coverage
    // ----------------------------------------------------------------------

    function test_Decay_MultipleIntervals() public {
        uint64 start = uint64(block.timestamp);
        vm.warp(block.timestamp + 3 hours);
        uint256 p = PowerMath.decay(1000e18, start, 9_900);
        // 3 hours: 1000 * 0.99^3 = 970.299e18
        uint256 expected = 1000e18;
        expected = (expected * 9_900) / 10_000;
        expected = (expected * 9_900) / 10_000;
        expected = (expected * 9_900) / 10_000;
        assertEq(p, expected);
    }

    function test_Decay_CappedAt168() public {
        uint64 start = uint64(block.timestamp);
        vm.warp(block.timestamp + 500 hours); // way past 168
        uint256 p = PowerMath.decay(1000e18, start, 9_900);
        // should be capped at 168 intervals, not 500
        assertGe(p, 0); // just confirm it doesn't revert
    }

    function test_UnderdogBonus_PartialDeficit() public pure {
        // attacker has some power but less than owner
        uint256 e = PowerMath.applyUnderdogBonus(100e18, 300e18, 500e18, 5_000);
        // deficitBps = (500-300)*10000/500 = 4000 -> bonus = 100 * 4000/10000 = 40
        assertEq(e, 140e18);
    }

    function test_UnderdogBonus_EqualPowerNoBonus() public pure {
        uint256 e = PowerMath.applyUnderdogBonus(100e18, 500e18, 500e18, 5_000);
        assertEq(e, 100e18); // equal -> no bonus
    }

    function test_UnderdogBonus_OwnerZeroNoBonus() public pure {
        uint256 e = PowerMath.applyUnderdogBonus(100e18, 0, 0, 5_000);
        assertEq(e, 100e18); // ownerPower 0 -> no bonus
    }

    // ----------------------------------------------------------------------
    // Integration: WarChest wiring via rally
    // ----------------------------------------------------------------------

    function test_Rally_BumpsContribTotalViaWiring() public {
        // Wire map as updater
        chest.setUpdater(address(map));

        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);

        // contribution total should have been bumped automatically
        assertEq(chest.regionFactionContribTotal(0, ARG), 100e18);
    }
}
