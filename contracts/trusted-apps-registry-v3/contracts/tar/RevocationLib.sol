// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./RevocationStoreLib.sol";
import "./AppStoreLib.sol";

library RevocationLib {
    event AddNewRevocation(
        bytes32 indexed appId,
        string indexed revokedByHash,
        string revokedBy,
        uint256 notBefore
    );

    /**
     * @dev Revoke application. Put the application id to the revocation list
     * and store revocation in the revocation store.
     */
    function insertRevocation(
        RevocationStoreLib.Revocations storage revocs,
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        string memory revokedBy,
        uint256 notBefore
    ) external {
        require(applicationId != bytes32(0), "appId empty");
        require(
            keccak256(bytes(revokedBy)) != keccak256(bytes("")),
            "revokedBy empty"
        );

        // Check that applicationId is registered
        require(
            apps.appStore[applicationId].applicationId == applicationId,
            "appId unknown"
        );
        // Check that applicationId is not revoked yet
        require(
            keccak256(bytes(revocs.revocationStore[applicationId].revokedBy)) ==
                keccak256(bytes("")),
            "appId revoked"
        );

        // push applicationId to revoked Applications List
        revocs.revokedApplicationsList.push(applicationId);
        // add applicationId to revocation Store
        revocs.revocationStore[applicationId] = RevocationStoreLib.Revocation(
            revokedBy,
            notBefore
        );

        emit AddNewRevocation(applicationId, revokedBy, revokedBy, notBefore);
    }

    /**
    Returns the Revocation based on the revocation ID
     */
    function getRevocation(
        RevocationStoreLib.Revocations storage revocs,
        bytes32 applicationId
    ) external view returns (string memory revokedBy, uint256 notBefore) {
        require(applicationId != bytes32(0), "appId empty");
        require(
            keccak256(bytes(revocs.revocationStore[applicationId].revokedBy)) !=
                keccak256(bytes("")),
            "revocation unknown"
        );
        revokedBy = revocs.revocationStore[applicationId].revokedBy;
        notBefore = revocs.revocationStore[applicationId].notBefore;
    }
}
