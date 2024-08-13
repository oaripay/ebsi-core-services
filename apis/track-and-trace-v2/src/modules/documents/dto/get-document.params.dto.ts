import { Is32BytesHex } from "../validators/Is32BytesHex.js";

export class GetDocumentParamsDto {
  @Is32BytesHex()
  "documentId"!: string;
}

export default GetDocumentParamsDto;
