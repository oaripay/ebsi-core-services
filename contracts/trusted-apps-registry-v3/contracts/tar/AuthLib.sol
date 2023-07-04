// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

import "./AuthStoreLib.sol";
import "./AppStoreLib.sol";
import "@ebsiint-sc/bootstrap-v2/contracts/utils/Pagination.sol";

library AuthLib {
    using Pagination for bytes32[];

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
        AuthStoreLib.Authorizations storage auths,
        AppStoreLib.Applications storage apps,
        string memory name,
        string memory authorizedAppName,
        string memory iss,
        AppStoreLib.Status status
    ) external {
        require(status != AppStoreLib.Status.undefined, "invalid status");
        // get applicationID and authorizedAppId
        bytes32 appId = apps.nameToId[name];
        require(appId != bytes32(0), "name unknown");
        bytes32 authorizedAppId = apps.nameToId[authorizedAppName];
        require(authorizedAppId != bytes32(0), "authapp unknown");

        // add an entry to the authorizedAppsStore if it doesn't exist
        if (
            !auths.authorizedAppsStore[appId].authorizedAppIdsAdded[
                authorizedAppId
            ]
        ) {
            auths.authorizedAppsStore[appId].authorizedAppIdsAdded[
                authorizedAppId
            ] = true;
            auths.authorizedAppsStore[appId].authorizedAppIds.push(
                authorizedAppId
            );
        }

        // compute authorizationID. Note that arguments are tightly packed which
        // means that the arguments are concatenated without padding
        bytes32 newAuthorizationId = sha256(
            abi.encode(appId, authorizedAppId, iss, status)
        );

        require(
            auths.authorizationStore[newAuthorizationId].applicationId ==
                bytes32(0),
            "auth exists"
        );
        // add this new authorizationId to the list of autorization for this authorized app
        auths.authorizedAppsStore[appId].authorizations[authorizedAppId].push(
            newAuthorizationId
        );
        // store this new authorization in authorizationStore

        auths.authorizationStore[newAuthorizationId] = AuthStoreLib
            .Authorization(appId, authorizedAppId, iss, status);

        // emit event
        emit AddNewAuthorization(
            appId,
            authorizedAppName,
            authorizedAppId,
            newAuthorizationId,
            status
        );
    }

    /**
     * @dev update an authorization
     */
    function updateAuthorization(
        AuthStoreLib.Authorizations storage auths,
        bytes32 authorizationId,
        AppStoreLib.Status status
    ) external {
        require(status != AppStoreLib.Status.undefined, "invalid status");
        require(authorizationId != bytes32(0), "auth null");
        // retrieve the authorization from authorizationStore
        bytes32 appId = auths.authorizationStore[authorizationId].applicationId;
        require(appId != bytes32(0), "auth unknown");

        AuthStoreLib.Authorization memory auth = auths.authorizationStore[
            authorizationId
        ];

        require(auth.status != status, "No new data for update");

        auths.authorizationStore[authorizationId].status = status;
        // emit event
        emit UpdateAuthorization(authorizationId, status);
    }

    /**
    Returns a paginated list of returns a paginated list of authorization ids - authorizations
    that the authorized app authorizedAppId  has over the application applicationId.
     */
    function getAuthorizations(
        AuthStoreLib.Authorizations storage auths,
        AppStoreLib.Applications storage apps,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        require(applicationId != bytes32(0), "appId empty");
        require(
            apps.appStore[applicationId].applicationId == applicationId,
            "appId unknown"
        );
        return
            auths
                .authorizedAppsStore[applicationId]
                .authorizations[authorizedAppId]
                .paginate(page, pageSize);
    }

    /**
    Returns a paginated list of application ids authorized to access resources of App designated by applicationId
     */
    function getAuthorizedAppsIds(
        AuthStoreLib.Authorizations storage auths,
        AppStoreLib.Applications storage apps,
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
        require(pageSize <= 50, "PSize not <= 50");
        require(pageSize > 0, "PSize not >0");
        require(page > 0, "Page not >0");
        require(applicationId != bytes32(0), "appId empty");
        require(
            apps.appStore[applicationId].applicationId == applicationId,
            "appId unknown"
        );

        return
            auths.authorizedAppsStore[applicationId].authorizedAppIds.paginate(
                page,
                pageSize
            );
    }

    /**
    Returns the Authorization based on the authorization ID
     */
    function getAuthorizationById(
        AuthStoreLib.Authorizations storage auths,
        AppStoreLib.Applications storage apps,
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
        require(
            auths.authorizationStore[authorizationId].applicationId !=
                bytes32(0),
            "auth unknown"
        );

        // retrieve app and authorized app names
        authorizedAppId = auths
            .authorizationStore[authorizationId]
            .authorizedApplicationId;
        authorizedAppName = apps.appStore[authorizedAppId].applicationName;
        // authorization must have been linked to an app and an authorizedApp
        require(
            keccak256(bytes(authorizedAppName)) != keccak256(bytes("")),
            "auth app unknown"
        );
        applicationId = auths.authorizationStore[authorizationId].applicationId;
        name = apps.appStore[applicationId].applicationName;
        require(keccak256(bytes(name)) != keccak256(bytes("")), "app unknown");
        iss = auths.authorizationStore[authorizationId].iss;
        status = auths.authorizationStore[authorizationId].status;
    }
}
