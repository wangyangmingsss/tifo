// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {WarChest} from "../src/WarChest.sol";
import {FactionRegistry} from "../src/FactionRegistry.sol";
import {TerritoryMap} from "../src/TerritoryMap.sol";
import {MatchOracle} from "../src/MatchOracle.sol";

/// @title Deploy
/// @notice One-shot deployment + full wiring of the TIFO protocol on X Layer.
/// @dev Run:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url https://testrpc.xlayer.tech \
///     --private-key $OPERATOR_PRIVATE_KEY \
///     --broadcast -vvv
///
/// Wiring performed here (closes every integration point in the spec):
///   1. WarChest.setMap(territoryMap)         -> chest can read territory state
///   2. WarChest.setUpdater(territoryMap)     -> rally() can bump claim denominator
///   3. TerritoryMap.transferOwnership(oracle)-> oracle can applyMatchBoost()
/// After step 3 the deployer is NO LONGER the map owner, so all admin map calls
/// (addRegions/setParams) must happen BEFORE the transfer. SeedMap.s.sol therefore
/// must be run by the oracle owner, or run addRegions here before transferring.
contract Deploy is Script {
    // Tunables (override via env if desired).
    uint16 constant INITIAL_REGIONS = 200;

    function run() external {
        uint256 pk = vm.envUint("OPERATOR_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        // 1. Currency
        MockUSDT usdt = new MockUSDT();

        // 2. Prize economy
        WarChest chest = new WarChest(address(usdt));

        // 3. Faction enrollment
        FactionRegistry registry = new FactionRegistry(address(usdt), address(chest));

        // 4. Territory core
        TerritoryMap map = new TerritoryMap(address(usdt), address(registry), address(chest));

        // 5. Match event oracle
        MatchOracle oracle = new MatchOracle(address(map));

        // ---- Wiring ----
        chest.setMap(address(map));
        chest.setUpdater(address(map)); // rally() -> bumpContribTotal()

        // Register the world map's regions while deployer still owns the map.
        map.addRegions(INITIAL_REGIONS);

        // Hand map ownership to the oracle so it can apply match boosts. Do this
        // LAST — after addRegions — since it strips the deployer's admin rights.
        // NOTE: if you need to run SeedMap (which calls owner-only addRegions/seed
        // helpers) separately, transfer ownership AFTER seeding instead.
        map.transferOwnership(address(oracle));

        vm.stopBroadcast();

        // ---- Log addresses for deployments/xlayer-testnet.json ----
        console2.log("MockUSDT        :", address(usdt));
        console2.log("WarChest        :", address(chest));
        console2.log("FactionRegistry :", address(registry));
        console2.log("TerritoryMap    :", address(map));
        console2.log("MatchOracle     :", address(oracle));
        console2.log("Deployer        :", deployer);
        console2.log("Regions seeded  :", INITIAL_REGIONS);
    }
}
