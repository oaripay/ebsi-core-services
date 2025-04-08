import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockCall } from "matchstick-as";

import {
  AddControllerCall,
  AddVerificationMethodCall,
  AddVerificationRelationshipCall,
  ExpireVerificationMethodCall,
  InsertDidDocumentCall,
  RevokeControllerCall,
  RevokeVerificationMethodCall,
  RollVerificationMethodCall,
  UpdateBaseDocumentCall,
} from "../generated/DidRegistry/DidRegistry";

export function createAddControllerCall(
  did: string,
  controller: string,
): AddControllerCall {
  const call = changetype<AddControllerCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam(
      "controller",
      ethereum.Value.fromString(controller),
    ),
  ];

  return call;
}

export function createAddVerificationMethodCall(
  did: string,
  vMethodId: string,
  publicKey: Bytes,
  isSecp256k1: boolean,
): AddVerificationMethodCall {
  const call = changetype<AddVerificationMethodCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
    new ethereum.EventParam("publicKey", ethereum.Value.fromBytes(publicKey)),
    new ethereum.EventParam(
      "isSecp256k1",
      ethereum.Value.fromBoolean(isSecp256k1),
    ),
  ];

  return call;
}

export function createAddVerificationRelationshipCall(
  did: string,
  name: string,
  vMethodId: string,
  notBefore: BigInt,
  notAfter: BigInt,
): AddVerificationRelationshipCall {
  const call = changetype<AddVerificationRelationshipCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam("name", ethereum.Value.fromString(name)),
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
    new ethereum.EventParam(
      "notBefore",
      ethereum.Value.fromUnsignedBigInt(notBefore),
    ),
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  ];

  return call;
}

export function createExpireVerificationMethodCall(
  did: string,
  vMethodId: string,
  notAfter: BigInt,
): ExpireVerificationMethodCall {
  const call = changetype<ExpireVerificationMethodCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  ];

  return call;
}

export function createInsertDidDocumentCall(
  did: string,
  baseDocument: string,
  vMethodId: string,
  publicKey: Bytes,
  isSecp256k1: boolean,
  notBefore: BigInt,
  notAfter: BigInt,
): InsertDidDocumentCall {
  const call = changetype<InsertDidDocumentCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam(
      "baseDocument",
      ethereum.Value.fromString(baseDocument),
    ),

    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),

    new ethereum.EventParam("publicKey", ethereum.Value.fromBytes(publicKey)),

    new ethereum.EventParam(
      "isSecp256k1",
      ethereum.Value.fromBoolean(isSecp256k1),
    ),

    new ethereum.EventParam(
      "notBefore",
      ethereum.Value.fromUnsignedBigInt(notBefore),
    ),

    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  ];

  return call;
}

export function createRevokeControllerCall(
  did: string,
  controller: string,
): RevokeControllerCall {
  const call = changetype<RevokeControllerCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam(
      "controller",
      ethereum.Value.fromString(controller),
    ),
  ];

  return call;
}

export function createRevokeVerificationMethodCall(
  did: string,
  vMethodId: string,
  notAfter: BigInt,
): RevokeVerificationMethodCall {
  const call = changetype<RevokeVerificationMethodCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam("vMethodId", ethereum.Value.fromString(vMethodId)),
    new ethereum.EventParam(
      "notAfter",
      ethereum.Value.fromUnsignedBigInt(notAfter),
    ),
  ];

  return call;
}

export function createRollVerificationMethodCall(
  did: string,
  vMethodId: string,
  publicKey: Bytes,
  isSecp256k1: boolean,
  notBefore: BigInt,
  notAfter: BigInt,
  oldVMethodId: string,
  duration: BigInt,
): RollVerificationMethodCall {
  const call = changetype<RollVerificationMethodCall>(newMockCall());

  const argsTupleArray: ethereum.Value[] = [
    ethereum.Value.fromString(did),
    ethereum.Value.fromString(vMethodId),
    ethereum.Value.fromBytes(publicKey),
    ethereum.Value.fromBoolean(isSecp256k1),
    ethereum.Value.fromUnsignedBigInt(notBefore),
    ethereum.Value.fromUnsignedBigInt(notAfter),
    ethereum.Value.fromString(oldVMethodId),
    ethereum.Value.fromUnsignedBigInt(duration),
  ];
  const argsTuple = changetype<ethereum.Tuple>(argsTupleArray);
  const argsValue = ethereum.Value.fromTuple(argsTuple);

  call.inputValues = [new ethereum.EventParam("args", argsValue)];

  return call;
}

export function createUpdateBaseDocumentCall(
  did: string,
  baseDocument: string,
): UpdateBaseDocumentCall {
  const call = changetype<UpdateBaseDocumentCall>(newMockCall());

  call.inputValues = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam(
      "baseDocument",
      ethereum.Value.fromString(baseDocument),
    ),
  ];

  return call;
}
