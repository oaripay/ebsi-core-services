// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "../utils/pausable/Pausable.sol";
import "./TirDetailed.sol";
import "./IssuerDetailed.sol";
import "./AdministratorDetailed.sol";
import "./PolicyDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Tir is
    Initializable,
    TirDetailed,
    IssuerDetailed,
    AdministratorDetailed,
    PolicyDetailed,
    Pausable
{
    function initialize(
        uint256 version,
        address operator,
        address[] memory pausers
    ) public initializer {
        TirDetailed.initialize(version, operator);

        Pausable.initialize(address(this));
        _removePauser(address(this));

        for (uint256 i = 0; i < pausers.length; ++i) {
            _addPauser(pausers[i]);
        }
    }
}
