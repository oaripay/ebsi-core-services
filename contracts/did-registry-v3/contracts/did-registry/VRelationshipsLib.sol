// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./VRelationshipsStorage.sol";
import "./CustomPagination.sol";

library VRelationshipsLib {
    using CustomPagination for VRelationshipsStorage.DidWithPeriod[];

    function addVerificationRelationship(
        VRelationshipsStorage.VRelationships storage vs,
        uint256 vrId,
        string memory did,
        uint256 notBefore,
        uint256 notAfter
    ) external returns (uint256) {
        uint256 indexDid = vs.didsByVRelationship[vrId].length;
        vs.didsByVRelationship[vrId].push(
            VRelationshipsStorage.DidWithPeriod(did, notBefore, notAfter)
        );
        return indexDid;
    }

    /**
     * @dev sets only the notAfter timestamp for a relation
     */

    function updateVerificationRelationship(
        VRelationshipsStorage.VRelationships storage vs,
        uint256 vrId,
        uint256 indexDid,
        uint256 notAfter
    ) external returns (bool) {
        vs.didsByVRelationship[vrId][indexDid].notAfter = notAfter;
        return true;
    }

    function getDidsByVerificationRelationshipId(
        VRelationshipsStorage.VRelationships storage vs,
        uint256 vrId,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            VRelationshipsStorage.DidWithPeriod[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        require(pageSize <= 50, "pageSize must be <= 50");
        return vs.didsByVRelationship[vrId].paginate(page, pageSize);
    }
}
