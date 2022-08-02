// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "./TarStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";

contract TarDetailed is Initializable, TarStorage {
    /**
     * @dev initialize the contract with the version
     * @param _version uint256
     */

    function init(uint256 _version) public onlyInitializing {
        _onInitialize(_version);
    }

    function _onInitialize(uint256 _version) internal onlyInitializing {
        Tar storage ds = TarStorage.tarStorage();
        ds._version = _version;
    }

    /**
     * @dev Returns the version of the Tar SC
     */
    function version() public view returns (uint256) {
        Tar storage ds = tarStorage();
        return ds._version;
    }
}
