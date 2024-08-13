import { Is32BytesHex } from "../validators/Is32BytesHex.js";

export class GetDocumentEventsParamsDto {
  @Is32BytesHex()
  "documentId"!: string;
}

export default GetDocumentEventsParamsDto;
