pragma solidity ^0.5.9;
pragma experimental ABIEncoderV2;



import "./roles/roles/Ownable.sol";
import "./roles/roles/Operator.sol";

contract EBSIApplicationRegistry is Ownable, Operator {



    /* ====================== DATA STRUCTURES ======================*/
    struct Application {
        string publicKey;
        string name;
        uint256 index;
        // keccak - sha3 - of applicationName keccak256(abi.encodePacked(applicationName)
        bytes32 code;
        uint256[] authorizedApps;
    }

    /* ====================== EVENTS ======================*/

    event ApplicationRegistered(
        uint256 indexed index,
        bytes32 indexed key
    );

    event AuthorizationAdded(
        uint256 indexed index1,
        uint256 indexed index2
    );

    event ApplicationUpdated(
        uint256 indexed index
    );

    event ApplicationDeleted(
        uint256 indexed index,
        bytes32 indexed key
    );

    event AuthorizationDeleted(
        uint256 indexed index1,
        uint256 indexed index2
    );


    /* ====================== STATE VARIABLES ======================*/
    // the ledger of all apps
    uint256 public index;
    mapping (uint256 => Application) registry;

    // mapping from app code to index
    mapping (bytes32 => uint256) registryKeys;


    // a mapping keeping track to whoever a app has access to
    mapping (uint256 => uint256[]) appAccessList;

    // an array of all app keys

    uint256[] indexes;


    /* ====================== PUBLIC API ======================*/

    constructor() public {
        // initialize the index
        index = 0;
    }

    function registerApp (string calldata publicKey, string calldata name)
    external
    onlyOperator
    returns (uint256)
    {

        bytes32 appCode = keccak256(abi.encodePacked(name));
        require(_checkAppByKeyExist(appCode) == false, 'Application already exists');
        require(keccak256(abi.encodePacked(publicKey)) != bytes32(0), 'invalid string for public key');
        return _registerApp(publicKey, name, appCode);
    }

    function updateApp (string calldata currentName, string calldata newName, string calldata publicKey)
    external
    onlyOperator
    returns (bool)
    {
        bytes32 appCode = keccak256(abi.encodePacked(currentName));
        bytes32 appCodeNew = keccak256(abi.encodePacked(newName));

        require(appCodeNew != bytes32(0), 'invalid name');
        require(_checkAppByKeyExist(appCode), 'Application does not exists');

        Application memory app = registry[registryKeys[appCode]];
        return _updateApp(publicKey, newName, app.index, app.code);
    }

    function deleteApp (string calldata name)
    external
    onlyOperator
    {
        bytes32 appCode = keccak256(abi.encodePacked(name));
        require(_checkAppByKeyExist(appCode) == true, 'Application does not exists');
        return _deleteApp(registryKeys[appCode]);
    }

    function addNewAuthorization (string calldata applicationName, string calldata authorizationName)
    external
    onlyOperator
    returns (uint256 length)
    {
        bytes32 appCode = keccak256(abi.encodePacked(applicationName));
        bytes32 authKey = keccak256(abi.encodePacked(authorizationName));

        Application memory app = _getAppByKey(appCode);
        Application memory authApp = _getAppByKey(authKey);


        require (app.code != bytes32(0), 'This does not exist');
        require (authApp.code != bytes32(0), 'Application you want to add as access does not exist');

        return _addNewAuthorization(app.index, authApp.index);
    }


    function deleteAuthorization (string calldata applicationName, string calldata authorizationName)
    external
    onlyOperator
    returns (uint256 length)
    {
        bytes32 appCode = keccak256(abi.encodePacked(applicationName));
        bytes32 authKey = keccak256(abi.encodePacked(authorizationName));

        Application memory app = _getAppByKey(appCode);
        Application memory authApp = _getAppByKey(authKey);


        require (app.code != bytes32(0), 'This does not exist');
        require (authApp.code != bytes32(0), 'Application you want to add as access does not exist');

        return _deleteAuthorization(app.index, authApp.index);

    }

    /* ====================== View Functions ======================*/

    function getApplicationPublicKey (string calldata applicationName)
    external
    view
    returns (string memory)
    {
        bytes32 appCode = keccak256(abi.encodePacked(applicationName));
        require(_checkAppByKeyExist(appCode) == true, 'Application does not exists');
        return registry[registryKeys[appCode]].publicKey;
    }

    function getAuthorizedApps (string calldata applicationName)
    external
    view
    returns (string[] memory)
    {
        bytes32 appCode = keccak256(abi.encodePacked(applicationName));
        require(_checkAppByKeyExist(appCode) == true, 'Application does not exists');
        return _getAuthorizedAppsByKey(appCode);
    }

    function getAuthorizedAppsByKey (bytes32 appKey)
    external
    view
    returns (string[] memory)
    {
        require(_checkAppByKeyExist(appKey) == true, 'Application does not exists');
        return _getAuthorizedAppsByKey(appKey);
    }

    function getApplicationKeys ()
    external
    view
    returns (uint256[] memory)
    {
        return indexes;
    }


    function getApplicationByKey (bytes32 appKey)
    external
    view
    returns (string memory, string memory, bytes32)
    {
        require(_checkAppByKeyExist(appKey) == true, 'Application does not exists');
        uint256 id = registryKeys[appKey];
        return (registry[id].name, registry[id].publicKey, registry[id].code);
    }


    function getApplicationByIndex (uint256 appIndex)
    external
    view
    returns (string memory, string memory, bytes32)
    {
        Application memory appRequested = _getAppByIndex(appIndex);
        return (appRequested.name, appRequested.publicKey, appRequested.code);
    }


    /* ============ Internal functions ============================= */

    function _registerApp(string memory publicKey, string memory name, bytes32 appCode)
    internal
    returns (uint256)
    {
        // increment index
        index = index + 1;
        // define new registry
        Application memory appRegistry;

        // set app variables
        appRegistry.publicKey = publicKey;
        appRegistry.name = name;
        appRegistry.code = appCode;
        appRegistry.index = index;
        // save app in the registry
        registryKeys[appCode] = index;
        registry[index] = appRegistry;
        indexes.push(index);

        emit ApplicationRegistered(index, appCode);

        return index;
    }

    function _updateApp (string memory publicKey, string memory name, uint256 id, bytes32 oldAppCode)
    internal
    returns (bool)
    {
        Application storage app = registry[id];
        app.publicKey = publicKey;
        app.name = name;
        app.code = keccak256(abi.encodePacked(name));
        delete registryKeys[oldAppCode];
        registryKeys[app.code] = id;
        emit ApplicationUpdated(id);
        return true;
    }

    function _deleteApp (uint256 id)
    internal
    {
        //delete from registry index registryKeys
        bytes32 deleteCode = registry[id].code;
        delete registryKeys[deleteCode];
        // delete app
        delete registry[id];
        // updated indexes
        for (uint256 i = 0; i<indexes.length; i++) {
            if (id == indexes[i]) {
                indexes[i] = indexes[indexes.length-1];
                indexes.pop();
                break;
            }
        }
        // update the remaining apps to remove the deleted app
        uint256[] memory affectedApps = appAccessList[id];
        for (uint256 i = 0; i < affectedApps.length; i++) {
            _deleteAuthorization(affectedApps[i], id);
        }
        emit ApplicationDeleted(id, deleteCode);
    }

    function _addNewAuthorization(uint256 appIndex, uint256 authorizedIndex)
    internal
    returns (uint256)
    {
        Application storage app = registry[appIndex];
        app.authorizedApps.push(authorizedIndex);
        appAccessList[authorizedIndex].push(appIndex);
        emit AuthorizationAdded(appIndex, authorizedIndex);
        return app.authorizedApps.length;
    }

    function _deleteAuthorization(uint256 appIndex, uint256 authorizedIndex)
    internal
    returns (uint256)
    {
        Application storage app = registry[appIndex];
        uint256[] storage authApps = app.authorizedApps;
        for (uint256 i = 0; i < authApps.length; i++) {
            if (authorizedIndex == authApps[i]) {
                authApps[i] = authApps[app.authorizedApps.length - 1];
                authApps.pop();
                emit AuthorizationDeleted(appIndex, authorizedIndex);
                break;
            }
        }
        return app.authorizedApps.length;
    }


    function _getAuthorizedAppsByKey (bytes32 name)
    internal
    view
    returns (string[] memory)
    {
        uint256[] memory authListIndexes = registry[registryKeys[name]].authorizedApps;
        string[] memory authList = new string[](authListIndexes.length);

        for (uint256 i = 0; i < authListIndexes.length; i++)
        {
            Application memory app = registry[authListIndexes[i]];
            authList[i] = app.name;
        }
        return (authList);
    }

    function _getAppByKey(bytes32 key)
    internal
    view
    returns (Application memory)
    {
        uint256 id = registryKeys[key];
        require(id != 0, 'Application index does not exist');
        Application memory app = registry[id];
        require (app.code != bytes32(0), 'Application does not exist');
        return app;
    }


    function _getAppByIndex(uint256 id)
    internal
    view
    returns (Application memory)
    {
        Application memory app = registry[id];
        require (app.code != bytes32(0), 'Application does not exist');
        return app;
    }

    function _checkAppByKeyExist (bytes32 appKey) internal view
    returns (bool)
    {

        require(appKey != bytes32(0), 'Invalid App Code');
        uint256 id = registryKeys[appKey];
        return id != 0;
    }


}
