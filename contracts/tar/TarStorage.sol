// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;

contract TarStorage {
    // The state variables we care about.
    bytes32 public constant TAR_DIAMOND_STORAGE_POSITION = keccak256(
        "diamond.standard.tar.storage"
    );

    struct Tar {
        uint256 _version;
    }

    // Creates and returns the storage pointer to the struct.
    function tarStorage() internal pure returns (Tar storage ms) {
        bytes32 position = TAR_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
