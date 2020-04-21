pragma experimental ABIEncoderV2;



import "./roles/roles/Ownable.sol";

contract EBSIApplicationRegistry is Ownable {

    struct ApplicationRegistry {
        string applicationPublicKey;

        string applicationName;
        // keccak - sha3 - of applicationName keccak256(abi.encodePacked(applicationName)
        bytes32 appCode;
        mapping (bytes32 => AuthApp) authList;
    }

    struct AuthApp {
        string authName;
        bool status;

    }

    mapping (bytes32 => ApplicationRegistry) registry;
    mapping (bytes32 => bytes32[]) mappingAuthList;
    bytes32[] public registryKeys;



    function addApplication (string calldata pubKey, string calldata name)
    external
    onlyOwner
    returns (bool)
    {
        ApplicationRegistry memory appRegistry;

        appRegistry.applicationPublicKey = pubKey;
        appRegistry.applicationName = name;
        appRegistry.appCode = keccak256(abi.encodePacked(name));
        registry[keccak256(abi.encodePacked(name))] = appRegistry;
        registryKeys.push(keccak256(abi.encodePacked(name)));
        return true;
    }

    function addNewAuthorization (string calldata applicationName, string calldata authorizationName, bool status)
    external
    onlyOwner
    returns (bool)
    {
        bytes32 appCode = keccak256(abi.encodePacked(applicationName));
        bytes32 authKey = keccak256(abi.encodePacked(authorizationName));

        require (registry[appCode].appCode != '', 'This does not exist');
        require (registry[authKey].appCode != '', 'Application you want to add as access does not exist');

        AuthApp memory authorizedApp;
        authorizedApp.status = status;
        authorizedApp.authName = authorizationName;
        registry[appCode].authList[authKey] = authorizedApp;
        mappingAuthList[appCode].push(authKey);

        return true;
    }


    function getApplicationPublicKey (string calldata applicationName)
    external
    view
    returns (string memory)
    {
        bytes32 appName = keccak256(abi.encodePacked(applicationName));
        require (registry[appName].appCode != '', 'Application does not exist');
        return registry[appName].applicationPublicKey;
    }

    function getAuthorizedApps (string calldata applicationName)
    external
    view
    returns (string[] memory, bool[] memory)
    {
        bytes32 appName = keccak256(abi.encodePacked(applicationName));
        require (registry[appName].appCode != '', 'Application does not exist');
        string[] memory authList = new string[](mappingAuthList[appName].length);
        bool[] memory statusList = new bool[](mappingAuthList[appName].length);



        for (uint256 i = 0; i < mappingAuthList[appName].length; i++)
        {
            authList[i] = registry[appName].authList[mappingAuthList[appName][i]].authName;
            statusList[i] = registry[appName].authList[mappingAuthList[appName][i]].status;
        }
        return (authList, statusList);
    }

    function getApplicationKeys ()
    external
    view
    returns (bytes32[] memory)
    {
        return registryKeys;
    }


    function getApplicationByKey (bytes32 appKey)
    external
    view
    returns (string memory, string memory)
    {
        require (registry[appKey].appCode != '', 'Application does not exist');
        return (registry[appKey].applicationName, registry[appKey].applicationPublicKey);
    }

    function getAuthorizedAppsByKey (bytes32 appKey)
    external
    view
    returns (string[] memory, bool[] memory)
    {
        require (registry[appKey].appCode != '', 'Application does not exist');
        string[] memory authList = new string[](mappingAuthList[appKey].length);
        bool[] memory statusList = new bool[](mappingAuthList[appKey].length);



        for (uint256 i = 0; i < mappingAuthList[appKey].length; i++)
        {
            authList[i] = registry[appKey].authList[mappingAuthList[appKey][i]].authName;
            statusList[i] = registry[appKey].authList[mappingAuthList[appKey][i]].status;
        }
        return (authList, statusList);
    }



}
