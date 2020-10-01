import * as ClassValidator from "class-validator";
import { ClassTransformer } from "class-transformer";
import { ClassType } from "class-transformer/ClassTransformer";
import { InvalidRequestJsonRpcError } from "./InvalidRequestJsonRpcError";

const validate = async (
  classType: ClassType<unknown>,
  data: unknown
): Promise<void> => {
  const dataClass = new ClassTransformer().plainToClass(classType, data);
  const errors = await ClassValidator.validate(dataClass);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
};

export { validate };
export { InvalidRequestJsonRpcError };
