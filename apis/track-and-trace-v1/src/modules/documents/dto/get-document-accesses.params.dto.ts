import { Is32BytesHex } from "../validators/Is32BytesHex.js";

export class GetDocumentAccessesParamsDto {
  @Is32BytesHex()
  "documentId"!: string;
}

export default GetDocumentAccessesParamsDto;
