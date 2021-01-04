// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.5;
pragma experimental ABIEncoderV2;

import "../utils/upgradeability/Initializable.sol";
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
}
