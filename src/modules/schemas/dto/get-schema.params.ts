import { IsSchemaId } from "../../../shared/validators";

export class GetSchemaParams {
  @IsSchemaId()
  schemaId: string;
}

export default GetSchemaParams;
