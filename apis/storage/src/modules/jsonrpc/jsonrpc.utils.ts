import * as ClassValidator from "class-validator";
import { ClassTransformer, ClassConstructor } from "class-transformer";
import { RequestCassandraCallDto } from "./dto/index.js";

type JsonRpcDtos = RequestCassandraCallDto;

export const validateClass = async (
  classType: ClassConstructor<JsonRpcDtos>,
  data: JsonRpcDtos,
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

export const isReadOperation = (query: string): boolean => {
  return query.trim().startsWith("select");
};
