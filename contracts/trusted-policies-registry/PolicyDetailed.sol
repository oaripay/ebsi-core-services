// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../bootstrap-ethereum-sc/contracts/utils/upgradeability/Initializable.sol";
import "./PolicyStorage.sol";
import "../bootstrap-ethereum-sc/contracts/utils/Pagination.sol";
import "./interfaces/PolicyInterface.sol";

abstract contract PolicyDetailed is PolicyStorage, PolicyInterface {




    /**
     * @dev insert an Policy
     */
    function insertPolicy(OPERATION_TYPE opType, PolicyDefinition[] calldata policyDefinitions, string calldata policyName)
        external
    {
        require (policyName != string(""), "Policy: invalid name");
        for(uint i; i<policyDefinitions.length; i++) {
            require (bytes(policyDefinitions[i].attributeName).length > 0, abi.encodePacked("Policy: invalid attribute name on counter ", i));

        }
        Policies storage ps = policyStorage();
        uint policyId = ps.lastPolicyId + 1;
        ps.lastPolicyId = policyId;
        Policy storage policy = ps.policies[policyId];
        policy.opType = opType;
        policy.policyName = policyName;






    }

    /**
     * @dev add a new policy's attribute
     */
    function updatePolicy(string calldata policyId, bytes calldata policyData)
        external
    {

    }

    /**
    Returns the data of the last revision
     */
    function getPolicy(string memory policyId)
        public
        view
        returns (bytes memory, bytes32)
    {
        Policies storage ds = policyStorage();
        bytes32[] memory policyRevisionHashes =
            ds.policyStore[policyId].revisionHashes;
        require(policyRevisionHashes.length > 0, "policy does not exist");
        bytes32 lastHash =
            policyRevisionHashes[policyRevisionHashes.length - 1];
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
        Policies storage ds = policyStorage();
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
        Policies storage ds = policyStorage();
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
        Policies storage ds = policyStorage();
        return ds.policyIdStore.paginate(page, pageSize);
    }

    uint256[50] private ______gap;
}
