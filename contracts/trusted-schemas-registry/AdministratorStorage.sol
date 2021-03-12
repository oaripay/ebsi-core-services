// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./AttributeStorage.sol";

contract AdministratorStorage is AttributeStorage {
    // The state variables we care about.
    bytes32 public constant TSR_ADMINISTRATOR_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.tsr.administrator.storage");

    struct Administrators {
        string[] didStore; // This is a a list of all Domain Administrators/Owners registered DIDs. (This property has been added because on Ethereum SC you can not loop over map)
        mapping(string => Entity) administratorStore; // This is a Collection object storing all Domain Administrators/Owners DID and their corresponding administration attributes, named Entity Objects.
        mapping(bytes32 => AttributeMetadata) attributeMetadataStore; // This is a Collection object storing all the attributes versions hashes of all administrators and their associated AttributeMetadata objects.
    }

    // Creates and returns the storage pointer to the struct.
    function administratorStorage()
        internal
        pure
        returns (Administrators storage ms)
    {
        bytes32 position = TSR_ADMINISTRATOR_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
