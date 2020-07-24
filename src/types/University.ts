import Accreditation from "./Accreditation";
import Entity from "./Entity";

export default interface University extends Entity {
  preferredName: string;

  alternativeName: string;

  homepage: string;

  escoOrganizationType: string;

  siteLocation: string;

  accreditations?: Accreditation[];
}
