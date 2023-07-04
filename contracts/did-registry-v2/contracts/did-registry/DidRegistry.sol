// SPDX-License-Identifier: EUPL V1.2
pragma solidity 0.8.12;

// solhint-disable-next-line max-line-length
import "@ebsiint-sc/bootstrap/contracts/utils/upgradeability/Initializable.sol";
import "./DidStorage.sol";
import "./DidDocumentDetailed.sol";

/**
 * @title example of stored values on a SC with pause functionality.
 *
 */
contract DidRegistry is DidStorage, DidDocumentDetailed, Initializable {
    IPolicyRegistry public immutable policyRegistryContract;
    IDidRegistry public immutable didRegistryContractV1;

    constructor(address _tprAddress, address _didRegistryV1Address) {
        policyRegistryContract = IPolicyRegistry(_tprAddress);
        didRegistryContractV1 = IDidRegistry(_didRegistryV1Address);
    }

    function initialize(uint256 v) public initializer {
        _onInitialize(v);
        setRegistryAddresses();
    }

    function setRegistryAddresses() public {
        DidDocuments storage ds = didDocumentStorage();
        ds.trustedPolicyRegistry = policyRegistryContract;
        ds.didRegistryV1 = didRegistryContractV1;
    }

    function _onInitialize(uint256 _version) internal onlyInitializing {
        TSC storage ts = DidStorage.tscStorage();
        ts.version = _version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function version() public view returns (uint256) {
        TSC storage ts = DidStorage.tscStorage();
        return ts.version;
    }

    /**
     * @dev Returns the version of the Timestamp SC
     */
    function setVersion(uint256 _version) public {
        TSC storage ts = DidStorage.tscStorage();
        ts.version = _version;
        setRegistryAddresses();
    }
}
