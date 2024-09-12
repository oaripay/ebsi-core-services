/* eslint-disable @typescript-eslint/ban-types */
import { ethereum } from "@graphprotocol/graph-ts";
import { Event } from "../generated/schema";

export const computeEventId = (event: ethereum.Event): string => {
  return event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString();
};

export const storeEvent = (
  event: ethereum.Event,
  eventName: string,
  did: string,
): void => {
  const eventData = new Event(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );

  eventData.did = did;
  eventData.signer = event.transaction.from;
  eventData.blockNumber = event.block.number;
  eventData.timestamp = event.block.timestamp;
  eventData.event = eventName;
  eventData.txId = event.transaction.hash;

  eventData.save();
};
