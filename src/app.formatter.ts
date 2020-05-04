import { Injectable } from "@nestjs/common";

@Injectable()
export class AppFormatter {
  formatDocument(document: any) {
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

  formatGovIssuer(govIssuer: any) {
    return {
      moderator: govIssuer.moderator,
      issuerDID: govIssuer.issuerDID,
      name: govIssuer.name,
      country: govIssuer.country,
      status: govIssuer.status
    };
  }

  formatUnivIssuer(univIssuer: any) {
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

  formatAccreditation(acc: any) {
    return {
      targetFramework: acc.targetFramework,
      targetResource: acc.targetResource
    };
  }
}
