// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./TarStorage.sol";

contract TarDetailed is Initializable, TarStorage {
    /**
     * @dev Sets the values for `operator`,   and `version`.
     */

    function init(uint256 version) public initializer {
        _onInitialize(version);
    }

    function _onInitialize(uint256 version) internal initializer {
        Tar storage ds = TarStorage.tarStorage();
        ds._version = version;
    }

    /**
     * @dev Returns the version of the Tar SC
     */
    function version() public view returns (uint256) {
        Tar storage ds = tarStorage();
        return ds._version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function setVersion(uint256 _version) public {
        Tar storage ds = tarStorage();
        ds._version = _version;
    }
}
