export interface IAttributeInfoList {
  list: Array<IAttributeInfo>;
}
export interface IAttributeData {
  base64: string;
}

export interface IAttributeInput {
  id: string;
  type: string[] | string;
  name: string;
  data: IAttributeData;
}

export interface IAttributeInfo {
  id: string;
  type: string[] | string;
  name: string;
  hash: string;
  did: string;
}

export interface IAttribute extends IAttributeInfo {
  data: IAttributeData;
}

export interface Filters {
  types: string[];
}
