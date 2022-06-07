// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// solhint-disable-next-line max-line-length
import "../did-registry-ethereum-sc/contracts/trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./TarPolicyStorage.sol";

library TarPolicyLib {
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
        TarPolicyStoreLib.Policies storage ds,
        string calldata policyId,
        bytes calldata policyData
    ) external {
        bytes32 firstPolicyHash = sha256(policyData);

        TarPolicyStoreLib.PolicyDetails storage p = ds.policyStore[policyId];
        require(p.revisionHashes.length == 0, "pol exist");

        require(ds.revisions[firstPolicyHash].length == 0, "pol data exist");

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
        TarPolicyStoreLib.Policies storage ds,
        string calldata policyId,
        bytes calldata policyData
    ) external {
        TarPolicyStoreLib.PolicyDetails storage p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "pol unknown");
        bytes32 newPolicyHash = sha256(policyData);

        require(ds.revisions[newPolicyHash].length == 0, "pol data exist");

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
        TarPolicyStoreLib.Policies storage ds,
        string memory policyId
    ) public view returns (bytes memory, bytes32) {
        bytes32[] memory policyRevisionHashes = ds
            .policyStore[policyId]
            .revisionHashes;
        require(policyRevisionHashes.length > 0, "pol unknown");
        bytes32 lastHash = policyRevisionHashes[
            policyRevisionHashes.length - 1
        ];
        return (ds.revisions[lastHash], lastHash);
    }

    /**
    Returns the data of the provided revision
     */
    function getPolicyByHash(
        TarPolicyStoreLib.Policies storage ds,
        bytes32 revisionHash
    ) public view returns (bytes memory) {
        require(ds.revisions[revisionHash].length > 0, "pol data unknown");

        return ds.revisions[revisionHash];
    }

    /**
    Returns all the revision hashes
     */
    function getPolicyRevisions(
        TarPolicyStoreLib.Policies storage ds,
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

        TarPolicyStoreLib.PolicyDetails memory p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "pId unknown");
        return p.revisionHashes.paginate(page, pageSize);
    }

    function getPolicies(
        TarPolicyStoreLib.Policies storage ds,
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
