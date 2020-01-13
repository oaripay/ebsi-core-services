const {expectRevert, constants} = require('openzeppelin-test-helpers');

const GovernmentsTrustedIssuers = artifacts.require('GovernmentsTrustedIssuers');
const ethrDidRegistry = artifacts.require('EthereumDIDRegistry');

contract('GovernmentsTrustedIssuers', function ([owner, account]) {
    describe('constructor', async function () {
        before(async function () {
            this.ethrDidRegistry = await ethrDidRegistry.new();
            this.governmentsTrustedIssuers = await GovernmentsTrustedIssuers.new(this.ethrDidRegistry.address);

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
                type: 1,
                dateStart: Date.now()
            };

            this.Government = Government;
            this.GovDocument = GovDocument;

            await this.governmentsTrustedIssuers.addTrustedIssuer(
                Government.issuerDID,
                Government.name,
                Government.country
            );

            await this.governmentsTrustedIssuers.addDocument(
                Government.issuerDID,
                GovDocument.vcCode,
                GovDocument.title,
                GovDocument.revision,
                GovDocument.status,
                GovDocument.dateStart
            );
        });

        it('should fail to set empty issuerDID', async function () {
            let emptyString = '';
            await expectRevert(this.governmentsTrustedIssuers.addTrustedIssuer(
                emptyString,
                this.Government.name,
                this.Government.country
            ), 'Invalid Issuer DID');
        });

        it('should throw an error if trusted issuer does not exist', async function () {
            expectRevert(this.governmentsTrustedIssuers.getTrustedIssuer(account), 'Trusted Issuer does not exist');
        });

        it('should fail to add same address added twice as a trusted issuer', async function () {
            await expectRevert(this.governmentsTrustedIssuers.addTrustedIssuer(
                this.Government.issuerDID,
                this.Government.name,
                this.Government.country
            ), 'Trusted Issuer already exists');
        });

        it('should check the address as being TRUE on trusted issuer list', async function () {
            const isTrustedIssuer = await this.governmentsTrustedIssuers.isTrustedIssuer(this.Government.issuerDID);
            assert(isTrustedIssuer === true, this.Government.issuerDID + ' should be a Trusted Issuer');
        });

        it('should check the address as being FALSE on trusted issuer list', async function () {
            const isTrustedIssuer = await this.governmentsTrustedIssuers.isTrustedIssuer(account);
            assert(isTrustedIssuer === false, account + ' should NOT be a Trusted Issuer');
        });

        it('should check we have 1 trusted issuer', async function () {
            const trustedIssuerIndex = await this.governmentsTrustedIssuers.getNrOfTrustedIssuers();
            assert(trustedIssuerIndex.length === 1, 'Length of the trusted issuers should be 1');
        });

        it('should be able to get created document', async function () {
            const documentIndexes = await this.governmentsTrustedIssuers.getAllDocumentIndexes(this.Government.issuerDID);
            const document = await this.governmentsTrustedIssuers.getDocument(this.Government.issuerDID, documentIndexes[0]);
            assert(document.vcCode === this.GovDocument.vcCode, 'Document vc code is not valid');
            assert(document.title === this.GovDocument.title, 'Document title is not valid');
            assert(document.revision === this.GovDocument.revision, 'Document revision is not valid');
            assert(document.status === this.GovDocument.status, 'Document status is not valid');
        });

        it('should be able to get a trusted issuer', async function () {
                const ts = await this.governmentsTrustedIssuers.getTrustedIssuer(this.Government.issuerDID);
                assert(ts.moderator === owner, 'Moderator is not valid');
                assert(ts.issuerDID === this.Government.issuerDID, 'IssuerDID is not valid');
                assert(ts.name === this.Government.name, 'Name is not valid');
                assert(ts.country === this.Government.country, 'Country is not valid');
        });

        it('should be able to get all document indexes', async function () {
            const documentIndexes = await this.governmentsTrustedIssuers.getAllDocumentIndexes(this.Government.issuerDID);
            assert(documentIndexes[0] === web3.utils.keccak256(this.GovDocument.vcCode), 'Document index not valid');
        });
    });
});
