// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "@ebsiint-sc/bootstrap/contracts/utils/upgradeability/Initializable.sol";
import "@ebsiint-sc/bootstrap/contracts/utils/pausable/Pausable.sol";

import "./AnchorDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Anchor is Initializable, AnchorDetailed, Pausable {
    constructor() {}

    function initialize(
        bytes32[] memory _fields,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address[] memory pausers
    ) public initializer {
        AnchorDetailed._onInitialize(_fields, _name, _symbol, _decimals);

        Pausable.initialize(address(this));
        _removePauser(address(this));

        for (uint256 i = 0; i < pausers.length; ++i) {
            _addPauser(pausers[i]);
        }
    }
}
