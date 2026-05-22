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
        // ARG takes region 0 via alice
        vm.prank(alice);
        registry.joinFaction(ARG);
        vm.prank(alice);
        map.rally(0, 100e18);

        // fund the faction pool directly + mirror contrib total
        token.mint(address(chest), 1000e18);
        chest.deposit(ARG, 1000e18, address(this));
        chest.setUpdater(address(this));
        chest.bumpContribTotal(0, ARG, 100e18); // mirror alice's contribution

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
}
