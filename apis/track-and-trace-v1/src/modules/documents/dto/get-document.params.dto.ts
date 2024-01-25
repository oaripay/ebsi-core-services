import { IsDocumentId } from "../validators/IsDocumentId.js";

export class GetDocumentParamsDto {
  @IsDocumentId()
  "documentId"!: string;
}

export default GetDocumentParamsDto;
