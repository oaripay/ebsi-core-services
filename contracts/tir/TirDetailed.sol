// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
import "./TirStorage.sol";

contract TirDetailed is Initializable, TirStorage {
    /**
     * @dev Sets the values for `operator`,   and `version`.
     */

    function initialize(uint256 version, address operator) public initializer {
        _onInitialize(version, operator);
    }

    function _onInitialize(uint256 version, address operator)
        internal
        initializer
    {
        Tir storage ds = TirStorage.tirStorage();
        ds._version = version;
        ds._operator = operator;
    }

    /**
     * @dev Returns the operator of the Tir SC
     */
    function operator() public view returns (address) {
        Tir storage ds = tirStorage();
        return ds._operator;
    }

    /**
     * @dev Returns the version of the Tir SC
     */
    function version() public view returns (uint256) {
        Tir storage ds = tirStorage();
        return ds._version;
    }

    uint256[50] private ______gap;
}
