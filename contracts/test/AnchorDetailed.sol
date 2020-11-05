// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;

import "../utils/upgradeability/Initializable.sol";

/**
 * @title example of stored values on a SC with an initialization.
 *
 */
abstract contract AnchorDetailed is Initializable {
    bytes32[] private _fields;
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    /**
     * @dev Sets the values for `name`, `symbol`, and `decimals`. All three of
     * these values are immutable: they can only be set once during
     * construction.
     */
    function initialize(
        bytes32[] memory fields,
        string memory name,
        string memory symbol,
        uint8 decimals
    ) public virtual initializer {
        _onInitialize(fields, name, symbol, decimals);
    }

    function _onInitialize(
        bytes32[] memory fields,
        string memory name,
        string memory symbol,
        uint8 decimals
    ) internal initializer {
        _fields = fields;
        _name = name;
        _symbol = symbol;
        _decimals = decimals;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function fields(uint8 i) public view returns (bytes32) {
        return _fields[i];
    }

    function setFields(bytes32[] memory newfields) external {
        _fields = newfields;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view returns (uint8) {
        return _decimals;
    }

    uint256[50] private ______gap;
}
