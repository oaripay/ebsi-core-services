// SPDX-License-Identifier: EUPL V1.2

pragma solidity ^0.8.26;

import "./interfaces/IProxyTemplateRegistry.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import "./libraries/Pagination.sol";

contract ProxyTemplateRegistry is
    IProxyTemplateRegistry,
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using Strings for string;
    using Pagination for bytes32[];
    // Role definitions for EBSI ecosystem
    bytes32 public constant EBSI_ADMIN_ROLE = keccak256("EBSI_ADMIN_ROLE"); // Add templates, manage registry

    mapping(bytes32 => ProxyTemplate) private templates;
    bytes32[] private templateIds;
    mapping(bytes32 => bool) private deprecatedTemplates;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EBSI_ADMIN_ROLE, msg.sender);
    }

    function addTemplate(
        ProxyTemplate calldata newTemplate
    ) external override onlyRole(EBSI_ADMIN_ROLE) {
        require(
            bytes(newTemplate.name).length > 0,
            "Template name cannot be empty"
        );
        require(
            bytes(newTemplate.version).length > 0,
            "Template version cannot be empty"
        );
        require(
            newTemplate.beaconAddress != address(0),
            "Beacon address cannot be zero"
        );

        // Validate that the beacon is actually an upgradeable beacon
        try IBeacon(newTemplate.beaconAddress).implementation() returns (
            address implementation
        ) {
            require(
                implementation != address(0),
                "Beacon implementation cannot be zero"
            );
        } catch {
            revert("Beacon address is not a valid upgradeable beacon");
        }
        require(
            bytes(newTemplate.repoURI).length > 0,
            "Repository URI cannot be empty"
        );
        require(
            bytes(newTemplate.auditURI).length > 0,
            "Audit URI cannot be empty"
        );
        require(
            newTemplate.contractHash != bytes32(0),
            "Contract hash cannot be zero"
        );
        require(
            newTemplate.storageLayoutHash != bytes32(0),
            "Storage layout hash cannot be zero"
        );

        bytes32 templateId = computeTemplateId(
            newTemplate.name,
            newTemplate.version
        );
        require(
            templates[templateId].beaconAddress == address(0),
            "Template already exists"
        );

        // Create a memory copy since calldata structs are read-only
        ProxyTemplate memory template = newTemplate;
        template.isActive = true;
        templates[templateId] = template;
        templateIds.push(templateId);

        emit TemplateAdded(templateId, newTemplate.name, newTemplate.version);
    }

    function deprecateTemplate(
        bytes32 templateId
    ) external override onlyRole(EBSI_ADMIN_ROLE) {
        require(
            templates[templateId].beaconAddress != address(0),
            "Template does not exist"
        );
        require(
            !deprecatedTemplates[templateId],
            "Template already deprecated"
        );

        deprecatedTemplates[templateId] = true;
        templates[templateId].isActive = false;

        emit TemplateDeprecated(templateId);
    }

    function updateTemplateMetadata(
        bytes32 templateId,
        string calldata repoURI,
        string calldata auditURI
    ) external override onlyRole(EBSI_ADMIN_ROLE) {
        require(
            templates[templateId].beaconAddress != address(0),
            "Template does not exist"
        );
        require(bytes(repoURI).length > 0, "Repository URI cannot be empty");
        require(bytes(auditURI).length > 0, "Audit URI cannot be empty");

        templates[templateId].repoURI = repoURI;
        templates[templateId].auditURI = auditURI;

        emit TemplateUpdated(templateId);
    }

    function getTemplate(
        bytes32 templateId
    ) external view override returns (ProxyTemplate memory) {
        return templates[templateId];
    }

    function computeTemplateId(
        string calldata name,
        string calldata version
    ) public pure override returns (bytes32) {
        return keccak256(abi.encode(name, version));
    }

    function getTemplateIds(
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
        (items, total, howMany, prev, next) = templateIds.paginate(
            page,
            pageSize
        );
    }

    function isTemplateActive(bytes32 templateId) external view returns (bool) {
        return
            templates[templateId].isActive && !deprecatedTemplates[templateId];
    }

    function getTemplateCount() external view returns (uint256) {
        return templateIds.length;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // EBSI_ADMIN_ROLE can manage other roles in the registry
    function grantRole(
        bytes32 role,
        address account
    ) public override onlyRole(EBSI_ADMIN_ROLE) {
        super.grantRole(role, account);
    }

    function revokeRole(
        bytes32 role,
        address account
    ) public override onlyRole(EBSI_ADMIN_ROLE) {
        super.revokeRole(role, account);
    }

    // Note: Logic contracts ownership is managed by EBSI Governance
    // This contract only manages templates and their metadata
}
