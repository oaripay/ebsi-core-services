pragma solidity ^0.5.8;

contract Notary {

    mapping(uint => uint) public timestamp;
    mapping(uint => uint) public blockNumber;
    mapping(uint => address) public registeredBy;
    
    uint public totalRecords;

    event REC(uint h, address a);
    event DUP(uint h, address a);

    constructor() public {}
    
    // add a single record
    function addRecord(uint z) public {
        if (z == 0 || timestamp[z] != 0) {
          emit DUP(z, msg.sender);
        } else {
          _addRec(z);
        }
    }

    // add multiple records
    function addMultipleRecords(uint[] memory zz) public returns (uint) {
        uint totalRecordsIni = totalRecords;
        for (uint i; i < zz.length; i++) {
            addRecord(zz[i]);
        }
        return totalRecords - totalRecordsIni;
    }

    function _addRec(uint z) private {
        timestamp[z] = now;
        blockNumber[z] = block.number;
        registeredBy[z] = msg.sender;
        totalRecords += 1;
        emit REC(z, msg.sender);
    }
}

