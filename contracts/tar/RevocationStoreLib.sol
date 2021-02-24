// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
import "./RevocationLib.sol";

library RevocationStoreLib {
    // The state variables we care about.
    bytes32 public constant REVOCATION_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.tar.revocation.storage");
    struct Revocation {
        // DID of the administrator that revoked the application
        string revokedBy;
        uint256 notBefore;
    }
    struct Revocations {
        // collection of revocations  applicationID =>  Revocation
        mapping(bytes32 => Revocation) revocationStore;
        // list of revoked application id
        bytes32[] revokedApplicationsList;
    }
}
