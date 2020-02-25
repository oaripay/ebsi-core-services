pragma solidity ^0.5.8;

contract Notary {
  mapping(bytes32 => address) public record;
  uint public totalRecords;

  // Event to record
  event REC(bytes32 indexed docHash, address indexed signer, uint indexed timestamp);

  // add a single record
  function addRecord(bytes32 docHash) public {
    require(record[docHash] == address(0), "This hash already exists");

    record[docHash] = msg.sender;
    emit REC(docHash, msg.sender, now);

    totalRecords ++;
  }
}
