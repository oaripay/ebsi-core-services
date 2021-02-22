// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
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
    PolicyDetailed
{
    function initialize(uint256 version) public initializer {
        TirDetailed.init(version);
    }
}
