// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;

import "./PolicyStorage.sol";
import "./PolicyLib.sol";

contract PolicyDetailed is PolicyStorage {
    using PolicyLib for PolicyStorage.Policies;
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
    function insertPolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        PolicyStorage.Policies storage ds = policyStorage();
        ds.insertPolicy(policyId, policyData);
    }

    /**
     * @dev add a new policy's attribute
     */
    function updatePolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        PolicyStorage.Policies storage ds = policyStorage();
        ds.updatePolicy(policyId, policyData);
    }

    /**
    Returns the data of the last revision
     */
    function getPolicy(string memory policyId)
        public
        view
        returns (bytes memory, bytes32)
    {
        PolicyStorage.Policies storage ds = policyStorage();
        return ds.getPolicy(policyId);
    }

    /**
    Returns the data of the provided revision
     */
    function getPolicyByHash(bytes32 revisionHash)
        public
        view
        returns (bytes memory)
    {
        PolicyStorage.Policies storage ds = policyStorage();
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
        PolicyStorage.Policies storage ds = policyStorage();
        return ds.getPolicyRevisions(policyId, page, pageSize);
    }

    function getPolicies(uint256 page, uint256 pageSize)
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
        PolicyStorage.Policies storage ds = policyStorage();
        return ds.getPolicies(page, pageSize);
    }
}
