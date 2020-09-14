pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "../utils/pausable/Pausable.sol";
import "./IssuerDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Issuer is Initializable, IssuerDetailed, Pausable {
    function initialize(
        uint256 version,
        address operator,
        address[] memory pausers
    ) public initializer {
        IssuerDetailed._onInitialize(version, operator);

        Pausable.initialize(address(this));
        _removePauser(address(this));

        for (uint256 i = 0; i < pausers.length; ++i) {
            _addPauser(pausers[i]);
        }
    }
}
