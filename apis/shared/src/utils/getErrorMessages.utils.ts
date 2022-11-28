import * as ClassValidator from "class-validator";

export function getErrorMessages(
  errors: ClassValidator.ValidationError[]
): string[] {
  return errors
    .map((err) => {
      const errorMessages: string[] = [];
      if (err.constraints) {
        errorMessages.push(...Object.values(err.constraints));
      }

      if (err.children) {
        errorMessages.push(...getErrorMessages(err.children));
      }

      return errorMessages;
    })
    .flat();
}

export default getErrorMessages;
