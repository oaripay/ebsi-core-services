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

    constructor(address _tprAddress) {
        policyRegistryContract = IPolicyRegistry(_tprAddress);
    }

    function initialize(uint256 v) public initializer {
        _onInitialize(v);
        setTrustedPoliciesRegistryAddress();
    }

    function setTrustedPoliciesRegistryAddress() public {
        DidDocuments storage ds = didDocumentStorage();
        ds.trustedPolicyRegistry = policyRegistryContract;
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
        setTrustedPoliciesRegistryAddress();
    }
}
