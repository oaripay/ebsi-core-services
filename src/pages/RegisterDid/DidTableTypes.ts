import { ReactElement } from "react";
import { BigNumber } from "ethers";

export type ModalPropsType = {
  visible: boolean;
  content: ReactElement;
  title: string;
  width: number;
  onOk?: (param?: any) => void;
};

export type DidRecordType = {
  controllerIds?: string[];
  totalDidVersions?: BigNumber;
};

export type DataType = {
  didControllers?: string[];
  versionHashes?: string[];
  metadata?: string[];
  timestampIds?: string[];
  administrators?: string[];
  versionInfos?: string[];
  metadataVersionIds?: string[];
  timestampsIds?: string[];
  did?: string;
  administratorLastHash?: string[];
  exists: boolean;
};

export type PropType = {
  didRecord: DidRecordType;
};

export type PaginatedResponse = {
  howMany: BigNumber;
  items: string[];
};

export type HashAlgo = {
  id: number;
  name: string;
};
