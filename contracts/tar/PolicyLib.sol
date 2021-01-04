// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.7.5;
pragma experimental ABIEncoderV2;

import "./PolicyStorage.sol";
import "../utils/Pagination.sol";
import "./PolicyStoreLib.sol";

library PolicyLib {
    using Pagination for bytes32[];
    using Pagination for string[];

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
        PolicyStoreLib.Policies storage ds,
        string calldata policyId,
        bytes calldata policyData
    ) external {
        bytes32 firstPolicyHash = sha256(policyData);

        PolicyStoreLib.PolicyDetails storage p = ds.policyStore[policyId];
        require(p.revisionHashes.length == 0, "pol exist");

        assert(ds.revisions[firstPolicyHash].length == 0);

        // store a link between this policyId to the policy to easily retrieve it
        // store the version hash and data for this policy
        p.revisionHashes.push(firstPolicyHash);
        ds.revisions[firstPolicyHash] = policyData;
        // push the policy ID
        ds.policyIdStore.push(policyId);

        emit AddNewPolicy(policyId, firstPolicyHash, policyData);
    }

    /**
     * @dev add a new policy's attribute
     */
    function updatePolicy(
        PolicyStoreLib.Policies storage ds,
        string calldata policyId,
        bytes calldata policyData
    ) external {
        PolicyStoreLib.PolicyDetails storage p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "pol unknown");
        bytes32 newPolicyHash = sha256(policyData);

        require(
            keccak256(bytes(ds.revisions[newPolicyHash])) ==
                keccak256(bytes("")),
            "pol data exist"
        );

        // store a link between this policyId to the policy to easily retrieve it
        // store the version hash and data for this attribute

        p.revisionHashes.push(newPolicyHash);
        ds.revisions[newPolicyHash] = policyData;
        emit UpdateExistingPolicy(policyId, newPolicyHash, policyData);
    }

    /**
    Returns the data of the last revision
     */
    function getPolicy(
        PolicyStoreLib.Policies storage ds,
        string memory policyId
    ) public view returns (bytes memory, bytes32) {
        bytes32[] memory policyRevisionHashes =
            ds.policyStore[policyId].revisionHashes;
        require(policyRevisionHashes.length > 0, "pol unknown");
        bytes32 lastHash =
            policyRevisionHashes[policyRevisionHashes.length - 1];
        return (ds.revisions[lastHash], lastHash);
    }

    /**
    Returns the data of the provided revision
     */
    function getPolicyByHash(
        PolicyStoreLib.Policies storage ds,
        bytes32 revisionHash
    ) public view returns (bytes memory) {
        require(
            keccak256(bytes(ds.revisions[revisionHash])) !=
                keccak256(bytes("")),
            "pol data unknown"
        );

        return ds.revisions[revisionHash];
    }

    /**
    Returns all the revision hashes
     */
    function getPolicyRevisions(
        PolicyStoreLib.Policies storage ds,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        PolicyStoreLib.PolicyDetails memory p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "pId unknown");
        return p.revisionHashes.paginate(page, pageSize);
    }

    function getPolicies(
        PolicyStoreLib.Policies storage ds,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");

        return ds.policyIdStore.paginate(page, pageSize);
    }
}
