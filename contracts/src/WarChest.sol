// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TifoTypes} from "./libraries/TifoTypes.sol";
import {ITerritoryMapView} from "./interfaces/ITerritoryMapView.sol";

contract WarChest {
    address public owner;
    address public immutable token;
    ITerritoryMapView public map;

    mapping(uint8 => uint256) public factionPrizePool;
    uint256 public passiveRatePerSecond = 1e12;
    mapping(uint16 => uint64) public lastAccrue;
    uint64 public seasonStart;
    bool public settled;
    mapping(uint8 => uint256) public finalScore;
    mapping(uint8 => uint256) public factionPayout;
    mapping(uint16 => mapping(uint8 => mapping(address => bool))) public claimed;
    mapping(uint16 => mapping(uint8 => uint256)) public regionFactionContribTotal;
    address public updater;

    event Deposited(uint8 indexed faction, uint256 amount, address indexed from);
    event PassiveAccrued(uint16 indexed regionId, uint8 indexed faction, uint256 amount);
    event SeasonSettled(uint256 totalScore, uint256 totalPool);
    event RewardClaimed(address indexed user, uint16 indexed regionId, uint8 indexed faction, uint256 amount);

    modifier onlyOwner() { if (msg.sender != owner) revert TifoTypes.NotOperator(); _; }

    constructor(address token_) { token = token_; owner = msg.sender; seasonStart = uint64(block.timestamp); }

    function setMap(address map_) external onlyOwner { map = ITerritoryMapView(map_); }
    function setUpdater(address updater_) external onlyOwner { updater = updater_; }

    function deposit(uint8 faction, uint256 amount, address from) external {
        if (faction >= TifoTypes.FACTION_COUNT) revert TifoTypes.InvalidFaction(faction);
        factionPrizePool[faction] += amount;
        emit Deposited(faction, amount, from);
    }

    function bumpContribTotal(uint16 regionId, uint8 faction, uint256 amount) external {
        if (msg.sender != updater) revert TifoTypes.NotOperator();
        regionFactionContribTotal[regionId][faction] += amount;
    }

    function accruePassive(uint16 regionId) public {
        if (settled) revert TifoTypes.SeasonAlreadySettled();
        (uint8 ownerFaction,,) = map.regions(regionId);
        uint64 last = lastAccrue[regionId];
        if (last == 0) last = seasonStart;
        if (ownerFaction == TifoTypes.NO_FACTION) { lastAccrue[regionId] = uint64(block.timestamp); return; }
        uint256 elapsed = block.timestamp - last;
        if (elapsed == 0) return;
        uint256 amount = elapsed * passiveRatePerSecond;
        lastAccrue[regionId] = uint64(block.timestamp);
        factionPrizePool[ownerFaction] += amount;
        emit PassiveAccrued(regionId, ownerFaction, amount);
    }

    function settleSeason() external onlyOwner {
        if (settled) revert TifoTypes.SeasonAlreadySettled();
        uint256[] memory counts = map.territoryCounts();
        uint256 totalScore; uint256 totalPool;
        for (uint8 f = 0; f < TifoTypes.FACTION_COUNT;) {
            finalScore[f] = counts[f]; totalScore += counts[f];
            factionPayout[f] = factionPrizePool[f]; totalPool += factionPrizePool[f];
            unchecked { ++f; }
        }
        settled = true;
        emit SeasonSettled(totalScore, totalPool);
    }

    function claim(uint16[] calldata regionIds) external {
        if (!settled) revert TifoTypes.SeasonNotActive();
        uint256 totalOut;
        for (uint256 i = 0; i < regionIds.length;) {
            uint16 rid = regionIds[i];
            (uint8 ownerFaction,,) = map.regions(rid);
            if (ownerFaction != TifoTypes.NO_FACTION && !claimed[rid][ownerFaction][msg.sender]) {
                uint256 mine = map.contribution(rid, ownerFaction, msg.sender);
                if (mine > 0) {
                    uint256 score = finalScore[ownerFaction];
                    if (score > 0) {
                        uint256 regionSlice = factionPayout[ownerFaction] / score;
                        uint256 denom = regionFactionContribTotal[rid][ownerFaction];
                        if (denom > 0) {
                            uint256 payout = (regionSlice * mine) / denom;
                            claimed[rid][ownerFaction][msg.sender] = true;
                            totalOut += payout;
                            emit RewardClaimed(msg.sender, rid, ownerFaction, payout);
                        }
                    }
                }
            }
            unchecked { ++i; }
        }
        if (totalOut > 0) _push(msg.sender, totalOut);
    }

    function setPassiveRate(uint256 r) external onlyOwner { passiveRatePerSecond = r; }
    function transferOwnership(address n) external onlyOwner { owner = n; }

    function _push(address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TifoTypes.TransferFailed();
    }
}
