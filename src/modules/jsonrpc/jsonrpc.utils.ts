import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { ethers } from "ethers";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import {
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  ArgsInsertPolicy,
  RequestInsertPolicyDto,
  ArgsInsertSchema,
  RequestInsertSchemaDto,
  ArgsUpdatePolicy,
  RequestUpdatePolicyDto,
  ArgsUpdateMetadata,
  RequestUpdateMetadataDto,
  ArgsUpdateSchema,
  RequestUpdateSchemaDto,
} from "./dto";
import { remove0xPrefix, computeId, prefixWith0x } from "../../shared/utils";

export function formatEthersUnsignedTransaction(
  unsignedTransaction: UnsignedTransaction
): ethers.UnsignedTransaction {
  return {
    to: unsignedTransaction.to,
    data: unsignedTransaction.data,
    value: unsignedTransaction.value,
    nonce: Number(unsignedTransaction.nonce),
    chainId: Number(unsignedTransaction.chainId),
    gasLimit: unsignedTransaction.gasLimit,
    gasPrice: unsignedTransaction.gasPrice,
  };
}

export function formatEthersSignature(
  r: string,
  s: string,
  v: string
): ethers.Signature {
  return {
    r,
    s,
    v: Number(v),
    recoveryParam: null,
    _vs: null,
  } as ethers.Signature;
}

type JsonRpcDtos =
  | RequestSendSignedTransactionDto
  | ArgsInsertPolicy
  | RequestInsertPolicyDto
  | ArgsInsertSchema
  | RequestInsertSchemaDto
  | ArgsUpdatePolicy
  | RequestUpdatePolicyDto
  | ArgsUpdateMetadata
  | RequestUpdateMetadataDto
  | ArgsUpdateSchema
  | RequestUpdateSchemaDto;

export const validateClass = async (
  classType: ClassConstructor<JsonRpcDtos>,
  data: JsonRpcDtos
): Promise<void> => {
  const dataClass = new ClassTransformer().plainToInstance<
    JsonRpcDtos,
    JsonRpcDtos
  >(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};

export const validateSchemaId = async (
  hexJsonSchema: string,
  expectedSchemaId: string
): Promise<void> => {
  // 1. Hex JSON -> JSON
  const jsonSchema = JSON.parse(
    Buffer.from(remove0xPrefix(hexJsonSchema), "hex").toString("utf8")
  ) as $RefParser.JSONSchema;

  // 2. Compute schema ID
  const schemaId = await computeId(jsonSchema);
  const actualSchemaId = prefixWith0x(schemaId.toString("hex"));

  // 3. Compare
  if (actualSchemaId !== expectedSchemaId) {
    throw new Error(
      `Invalid schema ID: "${expectedSchemaId}" is different from the actual schema ID "${actualSchemaId}"`
    );
  }
};
