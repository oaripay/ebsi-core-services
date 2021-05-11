// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./TirStorage.sol";

contract TirDetailed is Initializable, TirStorage {
    /**
     * @dev Sets the values for  `version`.
     */

    function init(uint256 version) public initializer {
        _onInitialize(version);
    }

    function _onInitialize(uint256 version) internal initializer {
        Tir storage ds = TirStorage.tirStorage();
        ds._version = version;
    }

    /**
     * @dev Returns the version of the Tir SC
     */
    function version() public view returns (uint256) {
        Tir storage ds = tirStorage();
        return ds._version;
    }

    function setVersion(uint256 _version) public {
        Tir storage ds = tirStorage();
        ds._version = _version;
    }

    uint256[50] private ______gap;
}
