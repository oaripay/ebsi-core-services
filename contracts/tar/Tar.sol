// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./TarDetailed.sol";
import "./AdministratorDetailed.sol";
import "./PolicyDetailed.sol";
import "./AppDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Tar is
    Initializable,
    TarDetailed,
    AppDetailed,
    AdministratorDetailed,
    PolicyDetailed
{
    function initialize(uint256 version) public initializer {
        TarDetailed.init(version);
    }
}
