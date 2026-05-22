// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TifoTypes} from "./libraries/TifoTypes.sol";

interface ITerritoryMapBoost {
    function applyMatchBoost(uint16 regionId, uint8 faction, uint256 boost) external;
}

contract MatchOracle {
    enum EventType { GOAL, PENALTY, RED_CARD, WHISTLE }

    address public owner;
    address public operator;
    ITerritoryMapBoost public immutable map;
    mapping(EventType => uint256) public boostFor;
    uint256 public eventCount;

    event MatchEventPushed(uint256 indexed eventId, uint8 indexed faction, EventType indexed eventType, uint16[] regions, uint256 boostApplied);
    event OperatorUpdated(address newOperator);
    event BoostConfigured(EventType eventType, uint256 boost);

    modifier onlyOwner() { if (msg.sender != owner) revert TifoTypes.NotOperator(); _; }
    modifier onlyOperator() { if (msg.sender != operator) revert TifoTypes.NotOperator(); _; }

    constructor(address map_) {
        map = ITerritoryMapBoost(map_); owner = msg.sender; operator = msg.sender;
        boostFor[EventType.GOAL] = 500e18; boostFor[EventType.PENALTY] = 250e18;
        boostFor[EventType.RED_CARD] = 150e18; boostFor[EventType.WHISTLE] = 0;
    }

    function pushMatchEvent(uint8 faction, EventType eventType, uint16[] calldata regions, uint256 overrideBoost) external onlyOperator {
        if (faction >= TifoTypes.FACTION_COUNT) revert TifoTypes.InvalidFaction(faction);
        uint256 boost = overrideBoost != 0 ? overrideBoost : boostFor[eventType];
        if (boost > 0) {
            for (uint256 i = 0; i < regions.length;) { map.applyMatchBoost(regions[i], faction, boost); unchecked { ++i; } }
        }
        uint256 id = eventCount++;
        emit MatchEventPushed(id, faction, eventType, regions, boost);
    }

    function setOperator(address o) external onlyOwner { operator = o; emit OperatorUpdated(o); }
    function setBoost(EventType e, uint256 b) external onlyOwner { boostFor[e] = b; emit BoostConfigured(e, b); }
    function transferOwnership(address n) external onlyOwner { owner = n; }
}
