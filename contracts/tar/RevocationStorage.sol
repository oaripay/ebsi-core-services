// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./RevocationStoreLib.sol";
import "./AppStorage.sol";

contract RevocationStorage is AppStorage {
    // Creates and returns the storage pointer to the struct.
    function revocationStorage()
        internal
        pure
        returns (RevocationStoreLib.Revocations storage ms)
    {
        bytes32 position = RevocationStoreLib
            .REVOCATION_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
