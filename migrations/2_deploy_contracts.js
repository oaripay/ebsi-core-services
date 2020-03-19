const UniversitiesTrustedIssuers = artifacts.require('UniversitiesTrustedIssuers');
const GovernmentsTrustedIssuers = artifacts.require('GovernmentsTrustedIssuers');
const EthereumDIDRegistry = artifacts.require('EthereumDIDRegistry');

module.exports = async (deployer, network) => {

    console.log('Deploying ethr did registry smart contract on network: ', network);
    await deployer.deploy(EthereumDIDRegistry);


    console.log('Deploying Universities Trusted Issuers smart contract on network: ', network);
    await deployer.deploy(UniversitiesTrustedIssuers, EthereumDIDRegistry.address);
    console.log('Contract deployed at address ' + UniversitiesTrustedIssuers.address);

    console.log('Deploying Governments Trusted Issuers smart contract on network: ', network);
    await deployer.deploy(GovernmentsTrustedIssuers, EthereumDIDRegistry.address);
    console.log('Contract deployed at address ' + GovernmentsTrustedIssuers.address);

    const universitiesTrustedIssuersInstance = await UniversitiesTrustedIssuers.deployed();
    const governmentsTrustedIssuersInstance = await GovernmentsTrustedIssuers.deployed();

    // Add University
    const SpanishUniversity = {
        issuerDID: '0x5B7a2FC380cb6f6389779c9FCCed050533FB21bb',
        id: 'U04200000',
        legalIdentifier: 'U04200078',
        vatIdentifier: 'Q9350003A',
        taxIdentifier: 'Q9350003A',
        identifier: 'agentIdentifier1',
        preferredName: 'Universitat Rovira i Virgili',
        alternativeName: 'Universitat Rovira i Virgili',
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
        title: 'Máster en bioinformática',
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
        issuerDID: '0x4D1A5522D2823941340d965b685a811483Bc7359',
        name: 'Government of Belgium',
        country: 'Belgium'
    };

    const GovDocument = {
        vcCode: '4313141',
        title: 'Identifier',
        revision: '1',
        status: 'Published',
        dateStart: Date.now()
    };

    const FlamishGovUniv = {
        issuerDID: '0x5B7a2FC380cb6f6389779c9FCCed050533FB21bE',
        id: 'urn:agent:000',
        legalIdentifier: 'LID89GRE',
        vatIdentifier: 'VAT12Y11I',
        taxIdentifier: 'TAX1249J',
        identifier: 'agentIdentifier1',
        preferredName: 'Katholieke Universiteit Leuven',
        alternativeName: 'KU Leuven',
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
        title: 'Bachelor en bioinformática',
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
