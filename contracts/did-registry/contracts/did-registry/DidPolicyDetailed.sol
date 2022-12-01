// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./DidPolicyStorage.sol";
import "./DidPolicyLib.sol";

contract DidPolicyDetailed is DidPolicyStorage {
    using DidPolicyLib for DidPolicyStorage.Policies;
    event AddNewPolicy(
        string indexed policyId,
        bytes32 indexed policyHash,
        bytes policy
    );
    event UpdateExistingPolicy(
        string indexed policyId,
        bytes32 indexed policyHash,
        bytes policy
    );

    /**
     * @dev insert an Policy
     */
    function insertPolicy(
        string calldata policyId,
        bytes calldata policyData
    ) external {
        DidPolicyStorage.Policies storage ds = didPolicyStorage();
        ds.insertPolicy(policyId, policyData);
    }

    /**
     * @dev add a new policy's attribute
     */
    function updatePolicy(
        string calldata policyId,
        bytes calldata policyData
    ) external {
        DidPolicyStorage.Policies storage ds = didPolicyStorage();
        ds.updatePolicy(policyId, policyData);
    }

    /**
    Returns the data of the last revision
     */
    function getPolicy(
        string memory policyId
    ) public view returns (bytes memory, bytes32) {
        DidPolicyStorage.Policies storage ds = didPolicyStorage();
        return ds.getPolicy(policyId);
    }

    /**
    Returns the data of the provided revision
     */
    function getPolicyByHash(
        bytes32 revisionHash
    ) public view returns (bytes memory) {
        DidPolicyStorage.Policies storage ds = didPolicyStorage();
        return ds.getPolicyByHash(revisionHash);
    }

    /**
    Returns all the revision hashes
     */
    function getPolicyRevisions(
        string calldata policyId,
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            bytes32[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        DidPolicyStorage.Policies storage ds = didPolicyStorage();
        return ds.getPolicyRevisions(policyId, page, pageSize);
    }

    function getPolicies(
        uint256 page,
        uint256 pageSize
    )
        public
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        DidPolicyStorage.Policies storage ds = didPolicyStorage();
        return ds.getPolicies(page, pageSize);
    }
}
