// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./AppStorage.sol";
import "./AppLib.sol";
import "./AppStoreLib.sol";

contract AppDetailed is AppStorage {
    using AppLib for AppStoreLib.Applications;
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
        string indexed oldName,
        string indexed newName,
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
        AppStoreLib.Status status,
        uint256 notBefore,
        uint256 notAfter
    );

    event PublicKeyUpdated(
        bytes32 indexed publicKeyId,
        AppStoreLib.Status status,
        uint256 notAfter
    );

    /* ====================== GETTERS ======================*/

    /**
     * @dev returns a paginated list of an application administrator DIDs.
     */
    function getAppAdministratorIds(
        bytes32 applicationId,
        uint256 page,
        uint256 pageSize
    )
        external
        view
        returns (
            string[] memory items,
            uint256 total,
            uint256 howMany,
            uint256 prev,
            uint256 next
        )
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppAdministratorIds(applicationId, page, pageSize);
    }

    /**
     * @dev For the given app info id, the method returns the info as bytes.
     */
    function getAppInfoByInfoId(bytes32 infoId)
        external
        view
        returns (bytes memory info)
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppInfoByInfoId(infoId);
    }

    /**
     * @dev For the given app id, the method returns a paginated list app info ids.
     */
    function getAppInfoIds(
        bytes32 applicationId,
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
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppInfoIds(applicationId, page, pageSize);
    }

    /**
     * @dev returns a paginated list of application public key ids by the application id.
     */
    function getAppPublicKeyIds(
        bytes32 applicationId,
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
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppPublicKeyIds(applicationId, page, pageSize);
    }

    /**
     * @dev returns the application object by application id.
     */
    function getAppById(bytes32 applicationId)
        external
        view
        returns (string memory name, AppStoreLib.Domains domain)
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppById(applicationId);
    }

    /**
     * @dev Get the latest version of the application info.
     */
    function getAppInfo(bytes32 applicationId)
        external
        view
        returns (bytes memory)
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppInfo(applicationId);
    }

    /**
     * @dev Get an application by a public key id. The method is used whenever
     * a consumer wants to learn if a public key belongs to an application,
     * registered in TAR.
     */
    function getAppByPublicKeyId(bytes32 publicKeyId)
        external
        view
        returns (
            bytes32 applicationId,
            string memory name,
            AppStoreLib.Domains domain
        )
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppByPublicKeyId(publicKeyId);
    }

    /**
     * @dev returns an application by name.
     */
    function getAppByName(string memory name)
        external
        view
        returns (bytes32 applicationId, AppStoreLib.Domains domain)
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getAppByName(name);
    }

    /**
     * @dev returns a paginated list of application ids.
     */
    function getApps(uint256 page, uint256 pageSize)
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
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getApps(page, pageSize);
    }

    /**
     * @dev return publick Key.
     */
    function getPublicKey(bytes32 publicKeyId)
        external
        view
        returns (
            bytes32 appId,
            bytes memory publicKey,
            AppStoreLib.Status status,
            uint256 notBefore,
            uint256 notAfter
        )
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.getPublicKey(publicKeyId);
    }

    /* ====================== SETTERS ======================*/

    /**
     * @dev enables to store additional application information. The information must be bytes encoded.
     */
    function insertAppInfo(bytes32 applicationId, bytes memory info) external {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.insertAppInfo(applicationId, info);
    }

    /**
     * @dev allows deleting an application administrator.
     */
    function deleteAppAdministrator(
        bytes32 applicationId,
        string memory administratorId
    ) external {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.deleteAppAdministrator(applicationId, administratorId);
    }

    /**
     * @dev allows inserting application administrators.
     */
    function insertAppAdministrator(
        bytes32 applicationId,
        string memory administratorId
    ) external {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.insertAppAdministrator(applicationId, administratorId);
    }

    /**
     * @dev Update application name and/or domain.
     */
    function updateApp(bytes32 applicationId, AppStoreLib.Domains domain)
        external
    {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.updateApp(applicationId, domain);
    }

    /**
     * @dev update public key validity and/or status.
     */
    function updateAppPublicKey(
        bytes32 publicKeyId,
        AppStoreLib.Status status,
        uint256 notAfter
    ) external {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.updateAppPublicKey(publicKeyId, status, notAfter);
    }

    /**
     * @dev Insert new application public key.
     */
    function insertAppPublicKey(
        bytes32 appId,
        bytes calldata publickey,
        AppStoreLib.Status status,
        uint256 notBefore,
        uint256 notAfter
    ) external {
        AppStoreLib.Applications storage apps = appStorage();
        return
            apps.insertAppPublicKey(
                appId,
                publickey,
                status,
                notBefore,
                notAfter
            );
    }

    /**
     * @dev registers a new application in the TAR.
     */
    function insertApp(
        string calldata name,
        AppStoreLib.Domains domain,
        string calldata appAdministrator
    ) external {
        AppStoreLib.Applications storage apps = appStorage();
        return apps.insertApp(name, domain, appAdministrator);
    }
}
