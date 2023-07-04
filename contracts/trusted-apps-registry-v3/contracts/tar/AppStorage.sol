// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;
import "./AppStoreLib.sol";

abstract contract AppStorage {
    // Creates and returns the storage pointer to the struct.
    function appStorage()
        internal
        pure
        returns (AppStoreLib.Applications storage ms)
    {
        bytes32 position = AppStoreLib.APP_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }

    uint256[50] private __gap;
}
