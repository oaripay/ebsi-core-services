// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;

import "../utils/upgradeability/Initializable.sol";
import "../utils/pausable/Pausable.sol";
import "./AnchorDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Anchor is Initializable, AnchorDetailed, Pausable {
    function initialize(
        bytes32[] memory fields,
        string memory name,
        string memory symbol,
        uint8 decimals,
        address[] memory pausers
    ) public initializer {
        AnchorDetailed._onInitialize(fields, name, symbol, decimals);

        Pausable.initialize(address(this));
        _removePauser(address(this));

        for (uint256 i = 0; i < pausers.length; ++i) {
            _addPauser(pausers[i]);
        }
    }
}
