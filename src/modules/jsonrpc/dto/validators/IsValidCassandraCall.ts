import { QueryOptions } from "cassandra-driver";
import { ValidateBy, ValidationOptions, buildMessage } from "class-validator";

export const IS_VALID_CASSANDRA_CALL = "isValidCassandraCall";

const allowedQueries = [
  "insert into notification_storage",
  "delete from notification_storage",
  "update notification_storage",
  "insert into attribute_storage",
  "delete from attribute_storage",
  "update attribute_storage",
  "select",
];

export function isValidCassandraCall(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const array = value as Array<string | number | QueryOptions>;
  if (array.length === 0) return false;
  if (typeof array[0] !== "string") return false;
  const query = array[0].trim().toLowerCase();
  if (
    !allowedQueries
      .map((allowedQuery) => query.startsWith(allowedQuery))
      .includes(true)
  )
    return false;

  // Only the last element can be Object
  const lastId = array.length - 1;
  if (
    array
      .map((val, id) => id !== lastId && typeof val === "object")
      .includes(true)
  )
    return false;

  return true;
}

export function IsValidCassandraCall(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: IS_VALID_CASSANDRA_CALL,
      validator: {
        validate: (value) => isValidCassandraCall(value),
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a valid cassandra call`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}
