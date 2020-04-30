import { IAttributeInfoList } from "../dtos/attributeInfo";

export interface AttributeDAO {
  did: string;
  data: IAttributeInfoList;
}
