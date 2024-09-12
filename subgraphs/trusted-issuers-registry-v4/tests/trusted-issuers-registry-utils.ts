/* eslint-disable @typescript-eslint/ban-types */
import { newMockEvent } from "matchstick-as";
import { ethereum, Bytes } from "@graphprotocol/graph-ts";
import {
  AttributeMetadataUpdated,
  AttributeDataUpdated,
  ProxyUpdated,
  ProxyRemoved,
} from "../generated/TrustedIssuersRegistry/TrustedIssuersRegistry";

export function createAttributeMetadataUpdated(
  did: string,
  attributeId: Bytes,
  issuerType: i32,
  taoDid: string,
  rootTaoDid: string,
  newRevisionId: Bytes,
): AttributeMetadataUpdated {
  const event = changetype<AttributeMetadataUpdated>(newMockEvent());
  const tuple = new ethereum.Tuple();
  tuple.push(ethereum.Value.fromString(did));
  tuple.push(ethereum.Value.fromBytes(attributeId));
  tuple.push(ethereum.Value.fromI32(issuerType));
  tuple.push(ethereum.Value.fromString(taoDid));
  tuple.push(ethereum.Value.fromString(rootTaoDid));

  event.parameters = [
    new ethereum.EventParam(
      "attributeMetadata",
      ethereum.Value.fromTuple(tuple),
    ),
    new ethereum.EventParam(
      "newRevisionId",
      ethereum.Value.fromBytes(newRevisionId),
    ),
  ];
  return event;
}

export function createAttributeDataUpdated(
  did: string,
  attributeId: Bytes,
  issuerType: i32,
  taoDid: string,
  rootTaoDid: string,
  newRevisionId: Bytes,
  attributeData: Bytes,
): AttributeDataUpdated {
  const event = changetype<AttributeDataUpdated>(newMockEvent());
  const tuple = new ethereum.Tuple();
  tuple.push(ethereum.Value.fromString(did));
  tuple.push(ethereum.Value.fromBytes(attributeId));
  tuple.push(ethereum.Value.fromI32(issuerType));
  tuple.push(ethereum.Value.fromString(taoDid));
  tuple.push(ethereum.Value.fromString(rootTaoDid));

  event.parameters = [
    new ethereum.EventParam(
      "attributeMetadata",
      ethereum.Value.fromTuple(tuple),
    ),
    new ethereum.EventParam(
      "newRevisionId",
      ethereum.Value.fromBytes(newRevisionId),
    ),
    new ethereum.EventParam(
      "attributeData",
      ethereum.Value.fromBytes(attributeData),
    ),
  ];
  return event;
}

export function createProxyUpdated(
  did: string,
  proxyId: Bytes,
  proxyData: string,
): ProxyUpdated {
  const event = changetype<ProxyUpdated>(newMockEvent());
  event.parameters = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam("proxyId", ethereum.Value.fromBytes(proxyId)),
    new ethereum.EventParam("proxyData", ethereum.Value.fromString(proxyData)),
  ];
  return event;
}

export function createProxyRemoved(did: string, proxyId: Bytes): ProxyRemoved {
  const event = changetype<ProxyRemoved>(newMockEvent());
  event.parameters = [
    new ethereum.EventParam("did", ethereum.Value.fromString(did)),
    new ethereum.EventParam("proxyId", ethereum.Value.fromBytes(proxyId)),
  ];
  return event;
}
