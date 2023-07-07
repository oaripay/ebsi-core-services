import * as ClassValidator from "class-validator";
import { ClassConstructor, ClassTransformer } from "class-transformer";
import { getErrorMessages } from "@ebsiint-api/shared";
import { RequestCheckControllerDto } from "./dto/request-check-controller.dto";

type JsonRpcDtos = RequestCheckControllerDto;

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
    const errorMessages = getErrorMessages(errors);

    if (errorMessages.length === 1) {
      throw new Error(`Validation error: ${errorMessages[0]}`);
    }

    throw new Error(
      `Validation errors:${errorMessages.map((err) => `\n- ${err}`).join()}`
    );
  }
};

export default validateClass;
