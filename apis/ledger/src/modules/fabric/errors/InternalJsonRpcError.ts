import { JsonRpcError } from "./JsonRpcError";

/**
 * InternalJsonRpcError defines the Method Not Found (-32601) error type.
 */
export class InternalJsonRpcError extends JsonRpcError {
  static defaultTitle = "Internal Error";

  /**
   * @param message A String providing a short description of the error. The message SHOULD be limited to a concise single sentence.
   * @param id It MUST be the same as the value of the id member in the Request Object.
   * @param data A Primitive or Structured value that contains additional information about the error. This may be omitted.
   */
  constructor(message: string, id: string | number, data?: unknown) {
    super(-32603, message, id, data);
    this.name = "InternalJsonRpcError";
  }
}

export default InternalJsonRpcError;
