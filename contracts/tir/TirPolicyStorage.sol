// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract TirPolicyStorage {
    // The state variables we care about.
    bytes32 public constant TIR_POLICY_DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.tir.policy.storage");

    struct PolicyDetails {
        // For a particular policy and a specific Policy id, this is the ordered
        // list of the hashes of all the policy version.
        bytes32[] revisionHashes;
    }

    struct Policies {
        // List of ids of all the registered domain policies.
        string[] policyIdStore;
        // For a particular Entity and a specific policy id, this is a collection of all
        // policy version hashes and corresponding policy JSON-LD value.
        mapping(bytes32 => bytes) revisions;
        // a Collection object storing all the policies ID with their linked Policy object.
        mapping(string => PolicyDetails) policyStore;
    }

    // Creates and returns the storage pointer to the struct.
    function tirPolicyStorage() internal pure returns (Policies storage ms) {
        bytes32 position = TIR_POLICY_DIAMOND_STORAGE_POSITION;
        assembly {
            ms.slot := position
        }
    }
}
