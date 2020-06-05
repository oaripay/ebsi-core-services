import { Injectable } from "@nestjs/common";
import UniversityIssuer from "../types/UniversityIssuer";
import GovernmentIssuer from "../types/GovernmentIssuer";
import DocumentInfo from "../types/DocumentInfo";
import Accreditation from "../types/Accreditation";

@Injectable()
export default class AppFormatter {
  static formatDocument(document: any): DocumentInfo {
    return {
      title: document.title,
      documentType: document.documentType || "",
      status: document.status,
      revision: document.revision,
      vcCode: document.vcCode,
      dateStart: parseInt(document.dateStart, 10),
      body: document.body ?? null
    };
  }

  static formatGovIssuer(govIssuer: any): GovernmentIssuer {
    return {
      moderator: govIssuer.moderator,
      issuerDID: govIssuer.issuerDID,
      name: govIssuer.name,
      country: govIssuer.country,
      status: govIssuer.status
    };
  }

  static formatUnivIssuer(univIssuer: any): UniversityIssuer {
    return {
      moderator: univIssuer.moderator,
      issuerDID: univIssuer.issuerDID,
      preferredName: univIssuer.preferredName,
      alternativeName: univIssuer.alternativeName,
      homepage: univIssuer.homepage,
      siteLocation: univIssuer.siteLocation,
      escoOrganizationType: univIssuer.escoOrganizationType,
      status: univIssuer.status
    };
  }

  static formatAccreditation(acc: any): Accreditation {
    return {
      targetFramework: acc.targetFramework,
      targetResource: acc.targetResource
    };
  }
}
