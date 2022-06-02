// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "../did-registry-ethereum-sc/contracts/trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./TirStorage.sol";

contract TirDetailed is Initializable, TirStorage {
    /**
     * @dev Sets the values for  `version`.
     */

    function init(uint256 v) public initializer {
        _onInitialize(v);
    }

    function _onInitialize(uint256 _version) internal initializer {
        Tir storage ds = TirStorage.tirStorage();
        ds._version = _version;
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
