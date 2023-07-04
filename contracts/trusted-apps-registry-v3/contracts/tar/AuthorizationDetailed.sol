// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./AuthorizationStorage.sol";
import "./AuthLib.sol";
import "./AppStoreLib.sol";
import "./DependencyRegistries.sol";

abstract contract AuthorizationDetailed is
    AuthorizationStorage,
    DependencyRegistries
{
    using AuthLib for AuthStoreLib.Authorizations;

    event AddNewAuthorization(
        bytes32 indexed appId,
        string indexed authorizedAppName,
        bytes32 authorizedAppId,
        bytes32 newAuthorizationId,
        AppStoreLib.Status status
    );
    event UpdateAuthorization(
        bytes32 authorizationId,
        AppStoreLib.Status status
    );

    /**
     * @dev insert an authorization
     */
    function insertAuthorization(
        string memory name,
        string memory authorizedAppName,
        string memory iss,
        AppStoreLib.Status status
    ) external {
        AppStoreLib.Applications storage apps = appStorage();
        AuthStoreLib.Authorizations storage auths = authStorage();
        bytes32 appId = apps.nameToId[name];
        requirePolicyOrAppAdmin("TAR:insertAuthorization", appId);
        requireDidController(iss);

        auths.insertAuthorization(apps, name, authorizedAppName, iss, status);
    }

    /**
     * @dev update an authorization
     */
    function updateAuthorization(
        bytes32 authorizationId,
        AppStoreLib.Status status
    ) external {
        AuthStoreLib.Authorizations storage auths = authStorage();
        bytes32 appId = auths.authorizationStore[authorizationId].applicationId;
        requirePolicyOrAppAdmin("TAR:updateAuthorization", appId);

        auths.updateAuthorization(authorizationId, status);
    }

    /**
    Returns a paginated list of returns a paginated list of authorization ids - authorizations
    that the authorized app authorizedAppId  has over the application applicationId.
     */
    function getAuthorizations(
        bytes32 applicationId,
        bytes32 authorizedAppId,
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
        AuthStoreLib.Authorizations storage auths = authStorage();
        AppStoreLib.Applications storage apps = appStorage();
        return
            auths.getAuthorizations(
                apps,
                applicationId,
                authorizedAppId,
                page,
                pageSize
            );
    }

    /**
    Returns a paginated list of application ids authorized to access resources of App designated by applicationId
     */
    function getAuthorizedAppsIds(
        bytes32 applicationId,
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
        AuthStoreLib.Authorizations storage auths = authStorage();
        AppStoreLib.Applications storage apps = appStorage();
        return auths.getAuthorizedAppsIds(apps, applicationId, page, pageSize);
    }

    /**
    Returns the Authorization based on the authorization ID
     */
    function getAuthorizationById(
        bytes32 authorizationId
    )
        public
        view
        returns (
            bytes32 applicationId,
            bytes32 authorizedAppId,
            string memory name,
            string memory authorizedAppName,
            string memory iss,
            AppStoreLib.Status status
        )
    {
        AppStoreLib.Applications storage apps = appStorage();
        AuthStoreLib.Authorizations storage auths = authStorage();
        return auths.getAuthorizationById(apps, authorizationId);
    }

    uint256[50] private __gap;
}
