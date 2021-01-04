// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.5;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./TarDetailed.sol";
import "./AdministratorDetailed.sol";
import "./PolicyDetailed.sol";
import "./AuthorizationDetailed.sol";
import "./RevocationDetailed.sol";
import "./AppDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract Tar is
    Initializable,
    TarDetailed,
    AppDetailed,
    PolicyDetailed,
    RevocationDetailed,
    AuthorizationDetailed,
    AdministratorDetailed
{
    function initialize(uint256 version) public initializer {
        TarDetailed.init(version);
    }
}
