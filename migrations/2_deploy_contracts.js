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
        issuerDID: 'did:ebsi:0xAa54d8B05f6EE6e57bDC1008F48EbCBC4dEaE831',
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
        vcCode: '4313148',
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
        issuerDID: 'did:ebsi:0xdE3d8e8f30B425ACe6F6549D3188Ae9F0047Ea1A',
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
        issuerDID: 'did:ebsi:0x9771A32Fe902c961CbE7c78Ec5183BEFBF782c19',
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
        vcCode: '4313149',
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


    // Add Belgium Government
    const Government2 = {
        issuerDID: 'did:ebsi:0xdE3d8e8f30B425ACe6F6549D3188Ae9F0047Ea1A0',
        name: 'Sample Verifiable ID Issuer',
        country: 'Belgium'
    };

    const GovDocument2 = {
        vcCode: '4313141',
        title: 'ESSIF Sample App: Issue eID Verifiable Credential',
        revision: '1',
        status: 'Published',
        dateStart: Date.now()
    };


    console.log ('Adding Government ' + Government2.name + ' code ' + Government2.issuerDID);
    await governmentsTrustedIssuersInstance.addTrustedIssuer(
        Government2.issuerDID,
        Government2.name,
        Government2.country
    );

    console.log ('Adding Government ' + Government2.name + ' document');
    await governmentsTrustedIssuersInstance.addDocument(
        Government2.issuerDID,
        GovDocument2.vcCode,
        GovDocument2.title,
        GovDocument2.revision,
        GovDocument2.status,
        GovDocument2.dateStart
    );
};
