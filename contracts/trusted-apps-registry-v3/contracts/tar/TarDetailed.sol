// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "./TarStorage.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

abstract contract TarDetailed is Initializable, TarStorage {
    event NewVersion(uint);

    /**
     * @dev initialize the contract with the version
     * @param _version uint256
     */

    function init(uint256 _version) public onlyInitializing {
        _onInitialize(_version);
    }

    function _onInitialize(uint256 _version) internal onlyInitializing {
        setVersion(_version);
    }

    /**
     * @dev Returns the version of the Tar SC
     */
    function version() external view returns (uint256) {
        Tar storage ds = tarStorage();
        return ds._version;
    }

    /**
     * @dev set the version of the TAR SC
     */
    function setVersion(uint256 _version) internal {
        Tar storage ts = tarStorage();
        ts._version = _version;
        emit NewVersion(_version);
    }

    uint256[50] private __gap;
}
