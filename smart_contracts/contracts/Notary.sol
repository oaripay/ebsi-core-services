pragma solidity ^0.5.8;

contract Notary {

    mapping(bytes32 => uint   ) public timestamp;
    mapping(bytes32 => uint   ) public blockNumber;
    mapping(bytes32 => address) public registeredBy;
    
    uint public totalRecords;

    event REC(bytes32 h, address a);
    event DUP(bytes32 h, address a);

    constructor() public {}
    
    // add a single record
    function addRecord(bytes32 z) public {
        if (z == 0 || timestamp[z] != 0) {
          emit DUP(z, msg.sender);
        } else {
          _addRec(z);
        }
    }

    // add multiple records
    function addMultipleRecords(bytes32[] memory zz) public returns (uint) {
        uint totalRecordsIni = totalRecords;
        for (uint i; i < zz.length; i++) {
            addRecord(zz[i]);
        }
        return totalRecords - totalRecordsIni;
    }

    function _addRec(bytes32 z) private {
        timestamp[z] = now;
        blockNumber[z] = block.number;
        registeredBy[z] = msg.sender;
        totalRecords += 1;
        emit REC(z, msg.sender);
    }
}

