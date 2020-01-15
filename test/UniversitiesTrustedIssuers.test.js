const {expectRevert, constants} = require('openzeppelin-test-helpers');

const UniversitiesTrustedIssuers = artifacts.require('UniversitiesTrustedIssuers');
const ethrDidRegistry = artifacts.require('EthereumDIDRegistry');

contract('UniversitiesTrustedIssuers', function ([owner, account]) {
    describe('constructor', async function () {
        before(async function () {
            this.ethrDidRegistry = await ethrDidRegistry.new();
            this.universitiesTrustedIssuers = await UniversitiesTrustedIssuers.new(this.ethrDidRegistry.address);

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
                escoOrganizationType: 'Educational Institution',
                status: true
            };

            const Diploma = {
                vcCode: '4313148',
                title: 'Máster en bioinformática',
                revision: 'Master Royal Decree 1393/2007',
                status: 'Published in B.O.E. Active',
                type: 2,
                dateStart: Date.now()
            };

            const Accreditation = {
                targetFramework: 'Europass Accreditation Database',
                targetResource: 'https://accreditation.europass.eu/12341455',
            };

            this.SpanishUniversity = SpanishUniversity;
            this.Diploma = Diploma;
            this.Accreditation = Accreditation;

            await this.universitiesTrustedIssuers.addTrustedIssuer(
                SpanishUniversity.issuerDID,
                SpanishUniversity.preferredName,
                SpanishUniversity.alternativeName,
                SpanishUniversity.homepage,
                SpanishUniversity.escoOrganizationType,
                SpanishUniversity.siteLocation
            );

            await this.universitiesTrustedIssuers.addTrustedIssuerIdentifiers(
                SpanishUniversity.issuerDID,
                SpanishUniversity.id,
                SpanishUniversity.legalIdentifier,
                SpanishUniversity.vatIdentifier,
                SpanishUniversity.taxIdentifier,
                SpanishUniversity.identifier,
            );

            await this.universitiesTrustedIssuers.addDocument(
                SpanishUniversity.issuerDID,
                Diploma.vcCode,
                Diploma.title,
                Diploma.revision,
                Diploma.status,
                Diploma.type,
                Diploma.dateStart
            );

            await this.universitiesTrustedIssuers.addAccreditation(
                SpanishUniversity.issuerDID,
                Accreditation.targetFramework,
                Accreditation.targetResource
            );
        });

        it('should fail to set empty issuerDID', async function () {
            let emptyString = '';
            await expectRevert(this.universitiesTrustedIssuers.addTrustedIssuer(
                emptyString,
                this.SpanishUniversity.preferredName,
                this.SpanishUniversity.alternativeName,
                this.SpanishUniversity.homepage,
                this.SpanishUniversity.escoOrganizationType,
                this.SpanishUniversity.siteLocation
            ), 'Invalid Issuer DID');
        });

        it('should throw an error if trusted issuer does not exist', async function () {
            expectRevert(this.universitiesTrustedIssuers.getTrustedIssuer(account), 'Trusted Issuer does not exist');
        });

        it('should fail to add same address added twice as a trusted issuer', async function () {
            await expectRevert(this.universitiesTrustedIssuers.addTrustedIssuer(
                this.SpanishUniversity.issuerDID,
                this.SpanishUniversity.preferredName,
                this.SpanishUniversity.alternativeName,
                this.SpanishUniversity.homepage,
                this.SpanishUniversity.escoOrganizationType,
                this.SpanishUniversity.siteLocation
            ), 'Trusted Issuer already exists');
        });

        it('should check the address as being TRUE on trusted issuer list', async function () {
            const isTrustedIssuer = await this.universitiesTrustedIssuers.isTrustedIssuer(this.SpanishUniversity.issuerDID);
            assert(isTrustedIssuer === true, this.SpanishUniversity.issuerDID + ' should be a Trusted Issuer');
        });

        it('should check the address as being FALSE on trusted issuer list', async function () {
            const isTrustedIssuer = await this.universitiesTrustedIssuers.isTrustedIssuer(account);
            assert(isTrustedIssuer === false, account + ' should NOT be a Trusted Issuer');
        });

        it('should check we have 1 trusted issuer', async function () {
            const trustedIssuerIndex = await this.universitiesTrustedIssuers.getNrOfTrustedIssuers();
            assert(trustedIssuerIndex.length === 1, 'Length of the trusted issuers should be 1');
        });

        it('should check we have 1 accreditation', async function () {
            const nrOfAccreditations = await this.universitiesTrustedIssuers.getNrOfAccreditations(this.SpanishUniversity.issuerDID);
            assert(nrOfAccreditations.length === 1, 'Length of the accreditations should be 1');
        });

        it('should be able to get the accreditation', async function () {
            const accreditation = await this.universitiesTrustedIssuers.getAccreditation(this.SpanishUniversity.issuerDID, 0);
            assert(accreditation[0] === this.Accreditation.targetFramework && accreditation[1] === this.Accreditation.targetResource, 'Accreditation is not valid');
        });

        it('should be able to get created document', async function () {
            const documentIndexes = await this.universitiesTrustedIssuers.getAllDocumentIndexes(this.SpanishUniversity.issuerDID);
            const document = await this.universitiesTrustedIssuers.getDocument(this.SpanishUniversity.issuerDID, documentIndexes[0]);
            assert(document.vcCode === this.Diploma.vcCode, 'Document vc code is not valid');
            assert(document.title === this.Diploma.title, 'Document title is not valid');
            assert(document.revision === this.Diploma.revision, 'Document revision is not valid');
            assert(document.status === this.Diploma.status, 'Document status is not valid');
            assert(document.documentType === 'Demo Master doc', 'Document type is not valid');
        });

        it('should be able to get a trusted issuer', async function () {
            const ts = await this.universitiesTrustedIssuers.getTrustedIssuer(this.SpanishUniversity.issuerDID);
            assert(ts.moderator === owner, 'Moderator is not valid');
            assert(ts.issuerDID === this.SpanishUniversity.issuerDID, 'IssuerDID is not valid');
            assert(ts.preferredName === this.SpanishUniversity.preferredName, 'Preferred name is not valid');
            assert(ts.alternativeName === this.SpanishUniversity.alternativeName, 'Alternative name is not valid');
            assert(ts.homepage === this.SpanishUniversity.homepage, 'Homepage is not valid');
            assert(ts.escoOrganizationType === this.SpanishUniversity.escoOrganizationType, 'Esco organization type is not valid');
            assert(ts.siteLocation === this.SpanishUniversity.siteLocation, 'Site location is not valid');
            assert(ts.status === this.SpanishUniversity.status, 'Status is not valid');
        });

        it('should be able to get a trusted issuer identifiers', async function () {
            const ts = await this.universitiesTrustedIssuers.getTrustedIssuerIdentifiers(this.SpanishUniversity.issuerDID);
            assert(ts.id === this.SpanishUniversity.id, 'Id identifier is not valid');
            assert(ts.legalIdentifier === this.SpanishUniversity.legalIdentifier, 'Legal identifier is not valid');
            assert(ts.vatIdentifier === this.SpanishUniversity.vatIdentifier, 'Vat identifier is not valid');
            assert(ts.taxIdentifier === this.SpanishUniversity.taxIdentifier, 'Tax identifier is not valid');
            assert(ts.identifier === this.SpanishUniversity.identifier, 'Identifier is not valid');
        });

        it('should be able to get all document indexes', async function () {
            const documentIndexes = await this.universitiesTrustedIssuers.getAllDocumentIndexes(this.SpanishUniversity.issuerDID);
            assert(documentIndexes[0] === web3.utils.keccak256(this.Diploma.vcCode), 'Document index not valid');
        });

        it('should be able to get trusted issuer by index', async function () {
            const ts = await this.universitiesTrustedIssuers.getTrustedIssuerByIndex(0);
            assert(ts.moderator === owner, 'Moderator is not valid');
            assert(ts.issuerDID === this.SpanishUniversity.issuerDID, 'IssuerDID is not valid');
            assert(ts.preferredName === this.SpanishUniversity.preferredName, 'Preferred name is not valid');
            assert(ts.alternativeName === this.SpanishUniversity.alternativeName, 'Alternative name is not valid');
            assert(ts.homepage === this.SpanishUniversity.homepage, 'Homepage is not valid');
            assert(ts.escoOrganizationType === this.SpanishUniversity.escoOrganizationType, 'Esco organization type is not valid');
            assert(ts.siteLocation === this.SpanishUniversity.siteLocation, 'Site location is not valid');
            assert(ts.status === this.SpanishUniversity.status, 'Status is not valid');
        });
    });
});
