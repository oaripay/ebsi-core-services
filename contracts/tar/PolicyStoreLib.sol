// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.5;
pragma experimental ABIEncoderV2;

library PolicyStoreLib {
    // The state variables we care about.
    bytes32 public constant TAR_POLICY_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.tar.policy.storage");

    struct PolicyDetails {
        bytes32[] revisionHashes; // For a particular policy and a specific Policy id, this is the ordered list of the hashes of all the policy version.
    }

    struct Policies {
        string[] policyIdStore; //  List of ids of all the registered domain policies.
        mapping(bytes32 => bytes) revisions; // For a particular Entity and a specific policy id, this is a collection of all policy version hashes and corresponding policy JSON-LD value.
        mapping(string => PolicyDetails) policyStore; // a Collection object storing all the policies ID with their linked Policy object.
    }
}
