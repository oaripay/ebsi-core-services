// SPDX-License-Identifier: EUPL V1.2
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../PolicyStorage.sol";

interface PolicyInterface {

    event AddNewPolicy(
        string indexed policyId,
        string policyName
    );
    event UpdateExistingPolicy(
        string indexed policyId,
        string policyName
    );


    function insertPolicy(OPERATION_TYPE opType, PolicyDefinition[] calldata policyDefinitions, string calldata policyName);


}
