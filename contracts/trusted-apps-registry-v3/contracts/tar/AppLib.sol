// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "./AppStorage.sol";
import "./AppStoreLib.sol";
import "@ebsiint-sc/bootstrap-v2/contracts/utils/Pagination.sol";

library AppLib {
    using Pagination for string[];
    using Pagination for bytes32[];
    uint public constant MAX_ADMINS = 10;

    /* ====================== EVENTS ======================*/

    event ApplicationRegistered(
        string indexed name,
        bytes32 indexed appId,
        AppStoreLib.Domains domain,
        string appAdministrator
    );
    event ApplicationAdministratorAdded(
        bytes32 indexed appId,
        string indexed adminHash,
        string administrator
    );
    event ApplicationAdministratorDeleted(
        bytes32 indexed appId,
        string indexed adminHash,
        string administrator
    );
    event ApplicationUpdated(
        bytes32 indexed appId,
        AppStoreLib.Domains oldDomain,
        AppStoreLib.Domains newDomain
    );

    event ApplicationInfoUpdated(
        bytes32 indexed appId,
        bytes32 indexed infoId,
        bytes info
    );

    event PublicKeyAdded(
        bytes32 indexed appId,
        bytes32 indexed publicKeyId,
        AppStoreLib.Status status
    );

    event PublicKeyUpdated(
        bytes32 indexed publicKeyId,
        AppStoreLib.Status status
    );

    modifier validateAppId(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId
    ) {
        require(applicationId != bytes32(0), "appId empty");
        require(
            apps.appStore[applicationId].applicationId == applicationId,
            "app unknown"
        );
        _;
    }

    /* ====================== GETTERS ======================*/

    /**
     * @dev returns a paginated list of an application administrator DIDs.
     */
    function getAppAdministratorIds(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        validateAppId(apps, applicationId)
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
        return
            apps.appStore[applicationId].administrators.paginate(
                page,
                pageSize
            );
    }

    /**
     * @dev For the given app info id, the method returns the info as bytes.
     */
    function getAppInfoByInfoId(
        AppStoreLib.Applications storage apps,
        bytes32 infoId
    ) external view returns (bytes memory info) {
        require(infoId != bytes32(0), "infoId empty");

        info = apps.infoStore[infoId];
        // Check that app is registered
        require(info.length > 0, "info empty");
    }

    /**
     * @dev For the given app id, the method returns a paginated list app info ids.
     */
    function getAppInfoIds(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        validateAppId(apps, applicationId)
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
        return apps.appStore[applicationId].infoIds.paginate(page, pageSize);
    }

    /**
     * @dev returns a paginated list of application public key ids by the application id.
     */
    function getAppPublicKeyIds(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        validateAppId(apps, applicationId)
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
        return
            apps.appStore[applicationId].publicKeyIds.paginate(page, pageSize);
    }

    /**
     * @dev returns the application object by application id.
     */
    function getAppById(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId
    )
        external
        view
        validateAppId(apps, applicationId)
        returns (string memory name, AppStoreLib.Domains domain)
    {
        name = apps.appStore[applicationId].applicationName;
        domain = apps.appStore[applicationId].domain;
    }

    /**
     * @dev Get the latest version of the application info.
     */
    function getAppInfo(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId
    ) external view validateAppId(apps, applicationId) returns (bytes memory) {
        uint256 infoLength = apps.appStore[applicationId].infoIds.length;
        require(infoLength > 0, "info empty");
        bytes32 infoId = apps.appStore[applicationId].infoIds[infoLength - 1];

        return apps.infoStore[infoId];
    }

    /**
     * @dev Get an application by a public key id. The method is used whenever
     * a consumer wants to learn if a public key belongs to an application,
     * registered in TAR.
     */
    function getAppByPublicKeyId(
        AppStoreLib.Applications storage apps,
        bytes32 publicKeyId
    )
        external
        view
        returns (
            bytes32 applicationId,
            string memory name,
            AppStoreLib.Domains domain
        )
    {
        require(publicKeyId != bytes32(0), "pubKeyId null");

        applicationId = apps.publicKeyStore[publicKeyId].applicationId;
        // Check that app is registered
        require(applicationId != bytes32(0), "app unknown");
        domain = apps.appStore[applicationId].domain;
        name = apps.appStore[applicationId].applicationName;
    }

    /**
     * @dev returns an application by name.
     */
    function getAppByName(
        AppStoreLib.Applications storage apps,
        string memory name
    )
        external
        view
        returns (bytes32 applicationId, AppStoreLib.Domains domain)
    {
        require(keccak256(bytes(name)) != keccak256(bytes("")), "name empty");

        applicationId = apps.nameToId[name];
        // Check that app is registered
        require(applicationId != bytes32(0), "app unknown");
        domain = apps.appStore[applicationId].domain;
    }

    /**
     * @dev returns a paginated list of application ids.
     */
    function getApps(
        AppStoreLib.Applications storage apps,
        uint256 page,
        uint256 pageSize
    )
        external
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

        return apps.applicationIdList.paginate(page, pageSize);
    }

    /**
     * @dev return publick Key.
     */
    function getPublicKey(
        AppStoreLib.Applications storage apps,
        bytes32 publicKeyId
    )
        external
        view
        returns (
            bytes32 appId,
            bytes memory publicKey,
            AppStoreLib.Status status
        )
    {
        require(publicKeyId != bytes32(0), "pubKeyId null");

        appId = apps.publicKeyStore[publicKeyId].applicationId;
        // Check that app is registered
        require(appId != bytes32(0), "app unknown");
        publicKey = apps.publicKeyStore[publicKeyId].publicKey;
        status = apps.publicKeyStore[publicKeyId].status;
    }

    /* ====================== SETTERS ======================*/

    /**
     * @dev enables to store additional application information. The information must be bytes encoded.
     */
    function insertAppInfo(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        bytes memory info
    ) external validateAppId(apps, applicationId) {
        require(info.length > 0, "info empty");
        bytes32 infoId = sha256(bytes(info));
        require(apps.infoStore[infoId].length == 0, "info exists");
        apps.appStore[applicationId].infoIds.push(infoId);
        apps.infoStore[infoId] = info;

        emit ApplicationInfoUpdated(applicationId, infoId, info);
    }

    /**
     * @dev allows deleting an application administrator.
     */
    function deleteAppAdministrator(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        string memory administratorId
    ) external validateAppId(apps, applicationId) {
        require(
            keccak256(bytes(administratorId)) != keccak256(bytes("")),
            "adminId empty"
        );
        string[] storage admins = apps.appStore[applicationId].administrators;
        uint256 adminLength = apps
            .appStore[applicationId]
            .administrators
            .length;
        uint256 indexToBeDeleted = adminLength;
        {
            // scope to reduce stack
            for (uint256 i = 0; i < adminLength; i++) {
                if (
                    keccak256(bytes(admins[i])) ==
                    keccak256(bytes(administratorId))
                ) {
                    indexToBeDeleted = i;
                    break;
                }
            }
        }

        require(indexToBeDeleted != adminLength, "no admin");
        // if index to be deleted is not the last index, swap position.
        if (indexToBeDeleted < adminLength - 1) {
            admins[indexToBeDeleted] = admins[adminLength - 1];
        }
        // we can now reduce the array length by 1
        admins.pop();
        apps.appStore[applicationId].isAdministrator[administratorId] = false;
        emit ApplicationAdministratorDeleted(
            applicationId,
            administratorId,
            administratorId
        );
    }

    /**
     * @dev allows inserting application administrators.
     */
    function insertAppAdministrator(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        string memory administratorId
    ) external validateAppId(apps, applicationId) {
        require(
            keccak256(bytes(administratorId)) != keccak256(bytes("")),
            "adminId empty"
        );

        require(
            apps.appStore[applicationId].isAdministrator[administratorId] ==
                false,
            "admin already exist"
        );

        require(
            apps.appStore[applicationId].administrators.length < MAX_ADMINS,
            "Maximum number of admins reached"
        );
        apps.appStore[applicationId].administrators.push(administratorId);
        apps.appStore[applicationId].isAdministrator[administratorId] = true;

        emit ApplicationAdministratorAdded(
            applicationId,
            administratorId,
            administratorId
        );
    }

    /**
     * @dev Update application name and/or domain.
     */
    function updateApp(
        AppStoreLib.Applications storage apps,
        bytes32 applicationId,
        AppStoreLib.Domains domain
    ) external validateAppId(apps, applicationId) {
        require(domain != AppStoreLib.Domains.undefined, "domain undefined");
        AppStoreLib.Domains oldDomain = apps.appStore[applicationId].domain;
        apps.appStore[applicationId].domain = domain;
        emit ApplicationUpdated(applicationId, oldDomain, domain);
    }

    /**
     * @dev update public key validity and/or status.
     */
    function updateAppPublicKey(
        AppStoreLib.Applications storage apps,
        bytes32 publicKeyId,
        AppStoreLib.Status status
    ) external {
        AppStoreLib.PublicKey memory publicKey = apps.publicKeyStore[
            publicKeyId
        ];

        require(status != publicKey.status, "No new data for update");

        apps.publicKeyStore[publicKeyId].status = status;
        emit PublicKeyUpdated(publicKeyId, status);
    }

    /**
     * @dev Insert new application public key.
     */
    function insertAppPublicKey(
        AppStoreLib.Applications storage apps,
        bytes32 appId,
        bytes calldata publickey,
        AppStoreLib.Status status
    ) external {
        addPublicKeyToStore(apps, appId, publickey, status);
    }

    function addPublicKeyToStore(
        AppStoreLib.Applications storage apps,
        bytes32 appId,
        bytes calldata publickey,
        AppStoreLib.Status status
    ) internal {
        bytes32 publicKeyId = sha256(publickey);
        // Check that public key is not registered already
        require(
            apps.publicKeyStore[publicKeyId].applicationId == bytes32(0),
            "pubkey exists"
        );
        apps.publicKeyStore[publicKeyId] = AppStoreLib.PublicKey(
            appId,
            publickey,
            status
        );
        apps.appStore[appId].publicKeyIds.push(publicKeyId);
        emit PublicKeyAdded(appId, publicKeyId, status);
    }

    /**
     * @dev registers a new application in the TAR.
     */
    function insertApp(
        AppStoreLib.Applications storage apps,
        string calldata name,
        AppStoreLib.Domains domain,
        string calldata appAdministrator
    ) external {
        require(domain != AppStoreLib.Domains.undefined, "domain undefined");
        require(keccak256(bytes(name)) != keccak256(bytes("")), "name empty");
        // Check that app with the same name or same public key is not registered already

        bytes32 appId = apps.nameToId[name];
        require(appId == "", "name exists");

        // Application id is calculated as SHA2-256 hash of the application name
        appId = sha256(bytes(name));

        // administrator must be provided.
        require(
            keccak256(bytes(appAdministrator)) != keccak256(bytes("")),
            "admin null"
        );

        // add appId to mapping and list
        apps.applicationIdList.push(appId);
        apps.nameToId[name] = appId;
        // add application object
        AppStoreLib.Application storage app = apps.appStore[appId];
        app.applicationName = name;
        app.applicationId = appId;
        app.administrators.push(appAdministrator);
        app.isAdministrator[appAdministrator] = true;
        app.domain = domain;

        emit ApplicationRegistered(
            name,
            appId,
            app.domain,
            app.administrators[0]
        );
    }
}
