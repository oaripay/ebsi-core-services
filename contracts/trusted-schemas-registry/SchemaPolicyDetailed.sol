// SPDX-License-Identifier: EUPL V1.2
// solhint-disable-next-line max-line-length

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
// solhint-disable-next-line max-line-length
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./SchemaPolicyStorage.sol";
// solhint-disable-next-line max-line-length
import "../trusted-policies-registry-ethereum-sc/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol";

abstract contract SchemaPolicyDetailed is SchemaPolicyStorage {
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
    function insertPolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        bytes32 firstPolicyHash = sha256(policyData);

        Policies storage ds = schemaPolicyStorage();
        PolicyDetails storage p = ds.policyStore[policyId];
        require(p.revisionHashes.length == 0, "policy already exist");

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
    function updatePolicy(string calldata policyId, bytes calldata policyData)
        external
    {
        Policies storage ds = schemaPolicyStorage();
        PolicyDetails storage p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "policy does not exist");
        bytes32 newPolicyHash = sha256(policyData);

        require(
            keccak256(bytes(ds.revisions[newPolicyHash])) ==
                keccak256(bytes("")),
            "policy data is already stored"
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
    function getPolicy(string memory policyId)
        public
        view
        returns (bytes memory, bytes32)
    {
        Policies storage ds = schemaPolicyStorage();
        bytes32[] memory policyRevisionHashes = ds
            .policyStore[policyId]
            .revisionHashes;
        require(policyRevisionHashes.length > 0, "policy does not exist");
        bytes32 lastHash = policyRevisionHashes[
            policyRevisionHashes.length - 1
        ];
        return (ds.revisions[lastHash], lastHash);
    }

    /**
    Returns the data of the provided revision
     */
    function getPolicyByHash(bytes32 revisionHash)
        public
        view
        returns (bytes memory)
    {
        Policies storage ds = schemaPolicyStorage();
        require(
            keccak256(bytes(ds.revisions[revisionHash])) !=
                keccak256(bytes("")),
            "policy data does not exist"
        );

        return ds.revisions[revisionHash];
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
        require(pageSize <= 50, "PageSize must be <= 50");
        require(pageSize > 0, "PageSize must be > 0");
        require(page > 0, "Page must be > 0");
        Policies storage ds = schemaPolicyStorage();
        PolicyDetails memory p = ds.policyStore[policyId];
        require(p.revisionHashes.length > 0, "policyId does not exist");
        return p.revisionHashes.paginate(page, pageSize);
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
        require(pageSize <= 50, "PageSize must be <= 50");
        require(pageSize > 0, "PageSize must be > 0");
        require(page > 0, "Page must be > 0");
        Policies storage ds = schemaPolicyStorage();
        return ds.policyIdStore.paginate(page, pageSize);
    }

    uint256[50] private ______gap;
}
