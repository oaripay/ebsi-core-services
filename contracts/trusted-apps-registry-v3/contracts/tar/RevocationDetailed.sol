// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./RevocationStorage.sol";
import "./RevocationStoreLib.sol";
import "./RevocationLib.sol";
import "./AppStoreLib.sol";
import "./DependencyRegistries.sol";

abstract contract RevocationDetailed is
    RevocationStorage,
    DependencyRegistries
{
    using RevocationLib for RevocationStoreLib.Revocations;
    event AddNewRevocation(
        bytes32 indexed appId,
        string indexed revokedByHash,
        string revokedBy,
        uint256 notBefore
    );

    /**
     * @dev insert an revocation
     */
    function insertRevocation(
        bytes32 applicationId,
        string calldata revokedBy,
        uint256 notBefore
    ) external {
        requirePolicy("TAR:insertRevocation");
        requireDidController(revokedBy);

        AppStoreLib.Applications storage apps = appStorage();
        RevocationStoreLib.Revocations storage revocs = revocationStorage();
        revocs.insertRevocation(apps, applicationId, revokedBy, notBefore);
    }

    /**
     * @dev get n revocation
     */
    function getRevocation(
        bytes32 applicationId
    ) external view returns (string memory revokedBy, uint256 notBefore) {
        RevocationStoreLib.Revocations storage revocs = revocationStorage();
        return revocs.getRevocation(applicationId);
    }

    uint256[50] private __gap;
}
