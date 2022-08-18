import { JsonRpcError } from "./JsonRpcError";

/**
 * InvalidRequestJsonRpcError defines the Invalid Request (-32600) error type.
 */

export class InvalidRequestJsonRpcError extends JsonRpcError {
  static statusCode = 400;

  static defaultTitle = "Invalid Request";

  /**
   * @param message A String providing a short description of the error. The message SHOULD be limited to a concise single sentence.
   * @param id It MUST be the same as the value of the id member in the Request Object.
   * @param data A Primitive or Structured value that contains additional information about the error. This may be omitted.
   */
  constructor(message: string, id: string | number, data?: unknown) {
    super(-32600, 400, message, id, data);
    this.name = "InvalidRequestJsonRpcError";
  }
}

export default InvalidRequestJsonRpcError;
