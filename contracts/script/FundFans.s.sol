// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

/// @title FundFans
/// @notice Pre-funds burner fan wallets with MockUSDT and OKB for gas.
///         Run this BEFORE SimulateWar to ensure all fans have gas.
/// @dev Run:
///   forge script script/FundFans.s.sol:FundFans \
///     --rpc-url https://testrpc.xlayer.tech \
///     --private-key $OPERATOR_PRIVATE_KEY --broadcast --slow -vv
contract FundFans is Script {
    function run() external {
        uint256 pk = vm.envUint("OPERATOR_PRIVATE_KEY");
        MockUSDT usdt = MockUSDT(vm.envAddress("MOCK_USDT"));
        uint256 fans = vm.envOr("SIM_FANS", uint256(20));
        uint256 batch = vm.envOr("SIM_BATCH", uint256(0));

        vm.startBroadcast(pk);

        for (uint256 i = 0; i < fans; i++) {
            uint256 globalIdx = batch * 1000 + i;
            uint256 fanPk = uint256(keccak256(abi.encodePacked("tifo.sim.fan", globalIdx))) >> 8;
            address fan = vm.addr(fanPk);

            // Mint MockUSDT
            usdt.mint(fan, 100_000e18);
            // Send OKB for gas
            (bool sent,) = fan.call{value: 0.003 ether}("");
            require(sent, "OKB transfer failed");
        }

        vm.stopBroadcast();
        console2.log("Funded fans:", fans, "batch:", batch);
    }
}
