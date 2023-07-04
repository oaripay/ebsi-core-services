// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;
import "./AuthStoreLib.sol";
import "./AppStorage.sol";

abstract contract AuthorizationStorage is AppStorage {
    // Creates and returns the storage pointer to the struct.
    function authStorage()
        internal
        pure
        returns (AuthStoreLib.Authorizations storage ms)
    {
        bytes32 position = AuthStoreLib.AUTHORIZATION_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }

    uint256[50] private __gap;
}
