// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./AuthorizationStorage.sol";
import "./AuthLib.sol";
import "./AppStoreLib.sol";

contract AuthorizationDetailed is AuthorizationStorage {
    using AuthLib for AuthStoreLib.Authorizations;

    event AddNewAuthorization(
        bytes32 indexed appId,
        string indexed authorizedAppName,
        bytes32 authorizedAppId,
        bytes32 newAuthorizationId,
        AppStoreLib.Status status,
        uint8 permissions,
        uint256 notBefore,
        uint256 notAfter
    );
    event UpdateAuthorization(
        bytes32 authorizationId,
        AppStoreLib.Status status,
        uint8 permissions,
        uint256 notAfter
    );

    /**
     * @dev insert an authorization
     */
    function insertAuthorization(
        string memory name,
        string memory authorizedAppName,
        string memory iss,
        AppStoreLib.Status status,
        uint8 permissions,
        uint256 notBefore,
        uint256 notAfter
    ) external {
        AppStoreLib.Applications storage apps = appStorage();
        AuthStoreLib.Authorizations storage auths = authStorage();
        auths.insertAuthorization(
            apps,
            name,
            authorizedAppName,
            iss,
            status,
            permissions,
            notBefore,
            notAfter
        );
    }

    /**
     * @dev update an authorization
     */
    function updateAuthorization(
        bytes32 authorizationId,
        AppStoreLib.Status status,
        uint8 permissions,
        uint256 notAfter
    ) external {
        AuthStoreLib.Authorizations storage auths = authStorage();
        AppStoreLib.Applications storage apps = appStorage();
        auths.updateAuthorization(
            apps,
            authorizationId,
            status,
            permissions,
            notAfter
        );
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
    function getAuthorizationById(bytes32 authorizationId)
        public
        view
        returns (
            bytes32 applicationId,
            bytes32 authorizedAppId,
            string memory name,
            string memory authorizedAppName,
            string memory iss,
            AppStoreLib.Status status,
            uint8 permissions,
            uint256 notBefore,
            uint256 notAfter
        )
    {
        AppStoreLib.Applications storage apps = appStorage();
        AuthStoreLib.Authorizations storage auths = authStorage();
        return auths.getAuthorizationById(apps, authorizationId);
    }
}
