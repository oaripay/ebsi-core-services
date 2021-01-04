// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.5;
import "./AdminStoreLib.sol";

contract AdministratorStorage {
    // Creates and returns the storage pointer to the struct.
    function administratorStorage()
        internal
        pure
        returns (AdminStoreLib.Administrators storage ms)
    {
        bytes32 position =
            AdminStoreLib.TAR_ADMINISTRATOR_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
