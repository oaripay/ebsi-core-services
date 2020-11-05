// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
import "./AttributeStorage.sol";

contract AppStorage is AttributeStorage {
    // The state variables we care about.
    bytes32 public constant APP_DIAMOND_STORAGE_POSITION = keccak256(
        "diamond.standard.tar.app.storage"
    );

    struct Application {
        string publicKey;
        string name;
        uint256 index;
        bytes32 code;
        uint256[] authorizedApps;
    }

    struct Applications {
        mapping(string => Application) appStore;
    }

    // Creates and returns the storage pointer to the struct.
    function appStorage() internal pure returns (Applications storage ms) {
        bytes32 position = APP_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
