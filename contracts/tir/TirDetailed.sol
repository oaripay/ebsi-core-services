// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./TirStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";

contract TirDetailed is Initializable, TirStorage {
    /**
     * @dev Sets the values for  `version`.
     */

    function init(uint256 v) public onlyInitializing {
        _onInitialize(v);
    }

    function _onInitialize(uint256 _version) internal onlyInitializing {
        Tir storage ds = TirStorage.tirStorage();
        if (_version != ds._version) {
            ds._version = _version;
        }
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
