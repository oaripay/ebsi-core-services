const UniversitiesTrustedIssuers = artifacts.require('UniversitiesTrustedIssuers');
const GovernmentsTrustedIssuers = artifacts.require('GovernmentsTrustedIssuers');

module.exports = async (deployer, network) => {


    console.log('Deploying Universities Trusted Issuers smart contract on network: ', network);
    await deployer.deploy(UniversitiesTrustedIssuers, {gas: 9000000});
    console.log('Contract deployed at address ' + UniversitiesTrustedIssuers.address);

    console.log('Deploying Governments Trusted Issuers smart contract on network: ', network);
    await deployer.deploy(GovernmentsTrustedIssuers);
    console.log('Contract deployed at address ' + GovernmentsTrustedIssuers.address);

    const universitiesTrustedIssuersInstance = await UniversitiesTrustedIssuers.deployed();
    const governmentsTrustedIssuersInstance = await GovernmentsTrustedIssuers.deployed();

    // Add University
    const SpanishUniversity = {
        issuerDID: 'did:ebsi:0x464190367BE948210608a46847bed183607f685A',
        id: 'U04200000',
        legalIdentifier: 'U04200078',
        vatIdentifier: 'Q9350003A',
        taxIdentifier: 'Q9350003A',
        identifier: 'agentIdentifier1',
        preferredName: 'Diploma Sample App: Issue Master\'s Diploma',
        alternativeName: 'Diploma Sample App: Issue Master\'s Diploma',
        homepage: 'http://www.urv.cat/',
        siteLocation: 'Tarragona',
        escoOrganizationType: 'Educational Institution'
    };

    console.log ('Adding university ' + SpanishUniversity.preferredName + ' code ' + SpanishUniversity.issuerDID);
    await universitiesTrustedIssuersInstance.addTrustedIssuer(
        SpanishUniversity.issuerDID,
        SpanishUniversity.preferredName,
        SpanishUniversity.alternativeName,
        SpanishUniversity.homepage,
        SpanishUniversity.escoOrganizationType,
        SpanishUniversity.siteLocation
    );

    await universitiesTrustedIssuersInstance.addTrustedIssuerIdentifiers(
        SpanishUniversity.issuerDID,
        SpanishUniversity.id,
        SpanishUniversity.legalIdentifier,
        SpanishUniversity.vatIdentifier,
        SpanishUniversity.taxIdentifier,
        SpanishUniversity.identifier,
    );

    // Adding diploma
    const Diploma = {
        vcCode: '0x15f5e9d610c3027072dd5566629d121c183f213bd34a610af69452fea3870e11',
        title: 'Sample University - Master\'s Programme',
        revision: 'Master Royal Decree 1393/2007',
        status: 'Published in B.O.E. Active',
        type: 2,
        dateStart: Date.now()
    };

    console.log ('Adding diploma ' + Diploma.title + ' to the university ' + SpanishUniversity.preferredName);
    await universitiesTrustedIssuersInstance.addDocument(
        SpanishUniversity.issuerDID,
        Diploma.vcCode,
        Diploma.title,
        Diploma.revision,
        Diploma.status,
        Diploma.type,
        Diploma.dateStart
    );

    // Adding Accreditation
    const Accreditation = {
        targetFramework: 'Europass Accreditation Database',
        targetResource: 'https://accreditation.europass.eu/12341455',
    };

    console.log ('Adding accreditation ' + Accreditation.targetFramework + ' to the university ' + SpanishUniversity.preferredName);
    await universitiesTrustedIssuersInstance.addAccreditation(
        SpanishUniversity.issuerDID,
        Accreditation.targetFramework,
        Accreditation.targetResource
    );

    // Add Belgium Government
    const Government = {
        issuerDID: 'did:ebsi:0x9f99F1f7482bC56735f8Df9f3Ffb280d54395c49',
        name: 'Sample Verifiable ID Issuer',
        country: 'Belgium'
    };

    const GovDocument = {
        vcCode: '4313141',
        title: 'ESSIF Sample App: Issue eID Verifiable Credential',
        revision: '1',
        status: 'Published',
        dateStart: Date.now()
    };

    const FlamishGovUniv = {
        issuerDID: 'did:ebsi:0x4ecC24C0a1912D8fA77E8e8dD823781a6e67BF1D',
        id: 'urn:agent:000',
        legalIdentifier: 'LID89GRE',
        vatIdentifier: 'VAT12Y11I',
        taxIdentifier: 'TAX1249J',
        identifier: 'agentIdentifier1',
        preferredName: 'Sample University - Bachelor\'s Programme',
        alternativeName: 'Sample University - Bachelor\'s Programme',
        homepage: 'https://www.keuleuven.be',
        siteLocation: 'Leuven',
        escoOrganizationType: 'Educational Institution'
    };

    console.log ('Adding Government ' + Government.name + ' code ' + Government.issuerDID);
    await governmentsTrustedIssuersInstance.addTrustedIssuer(
        Government.issuerDID,
        Government.name,
        Government.country
    );

    console.log ('Adding Government ' + Government.name + ' document');
    await governmentsTrustedIssuersInstance.addDocument(
        Government.issuerDID,
        GovDocument.vcCode,
        GovDocument.title,
        GovDocument.revision,
        GovDocument.status,
        GovDocument.dateStart
    );

    console.log ('Adding Flamish GOV Univ ' + Government.name + ' code ' + Government.issuerDID);
    await universitiesTrustedIssuersInstance.addTrustedIssuer(
        FlamishGovUniv.issuerDID,
        FlamishGovUniv.preferredName,
        FlamishGovUniv.alternativeName,
        FlamishGovUniv.homepage,
        FlamishGovUniv.escoOrganizationType,
        FlamishGovUniv.siteLocation
    );

    const FlamishGovDiploma = {
        vcCode: '0x09eca16ba76840a8ad92f5cc86f54ec1820c55cbdba736d7ff4554e28aa42968',
        title: 'Diploma Sample App: Issue Bachelor\'s Diploma',
        revision: 'Bachelor Royal Decree 1393/2007',
        status: 'Published in B.O.E. Active',
        type: 1,
        dateStart: Date.now()
    };

    // Adding documents that can be issued by this gov
    console.log ('Adding diploma ' + FlamishGovDiploma.title + ' to the Universities ' + Government.name);
    await universitiesTrustedIssuersInstance.addDocument(
        FlamishGovUniv.issuerDID,
        FlamishGovDiploma.vcCode,
        FlamishGovDiploma.title,
        FlamishGovDiploma.revision,
        FlamishGovDiploma.status,
        FlamishGovDiploma.type,
        FlamishGovDiploma.dateStart
    );

    console.log ('Adding accreditation ' + Accreditation.targetFramework + ' to the government ' + Government.name);
    await universitiesTrustedIssuersInstance.addAccreditation(
        FlamishGovUniv.issuerDID,
        Accreditation.targetFramework,
        Accreditation.targetResource
    );
};
