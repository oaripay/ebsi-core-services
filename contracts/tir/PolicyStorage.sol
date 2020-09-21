// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

contract PolicyStorage  {
  // The state variables we care about.
  bytes32 constant TIR_POLICY_DIAMOND_STORAGE_POSITION = keccak256(
    "diamond.standard.tir.policy.storage"
  );


  struct PolicyModel {
    string[] policyIDs; // list of all policies Unique policy ID
    mapping(string => bytes) policies; //     policyID: -> [Policy]
  }

  // Creates and returns the storage pointer to the struct.
  function policyStorage() internal pure returns (PolicyModel storage ms) {
    bytes32 position = TIR_POLICY_DIAMOND_STORAGE_POSITION;
    assembly {
      ms.slot := position
    }
  }
}
