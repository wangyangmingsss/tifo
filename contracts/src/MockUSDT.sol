// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockUSDT {
    string public constant name = "Mock USDT";
    string public constant symbol = "mUSDT";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public constant FAUCET_AMOUNT = 1000e18;
    uint256 public constant FAUCET_COOLDOWN = 12 hours;
    mapping(address => uint256) public lastFaucet;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Faucet(address indexed to, uint256 amount);
    error FaucetCooldown(uint256 retryAt);
    error InsufficientBalance();
    error InsufficientAllowance();

    function faucet() external {
        uint256 next = lastFaucet[msg.sender] + FAUCET_COOLDOWN;
        if (lastFaucet[msg.sender] != 0 && block.timestamp < next) revert FaucetCooldown(next);
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Faucet(msg.sender, FAUCET_AMOUNT);
    }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function transfer(address to, uint256 amount) external returns (bool) { _transfer(msg.sender, to, amount); return true; }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount; emit Approval(msg.sender, spender, amount); return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount); return true;
    }
    function _transfer(address from, address to, uint256 amount) internal {
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked { balanceOf[from] = bal - amount; balanceOf[to] += amount; }
        emit Transfer(from, to, amount);
    }
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount; unchecked { balanceOf[to] += amount; } emit Transfer(address(0), to, amount);
    }
}
