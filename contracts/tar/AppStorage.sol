// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./AppStoreLib.sol";

contract AppStorage {
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
}
