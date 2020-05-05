import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import {AppController} from './app.controller';
import {AppFormatter} from './app.formatter';
import {NotFoundException} from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import testValues from './testVar.json';
import {UniversityBody} from './validation';

class AppServiceMock {
    getIssuer(did: string) {
        return testValues.issuerResult;
    }
    getUniversityTrustedIssuers() { return []; }
    getDocuments() { return []; }
    getGovTrustedIssuers() { return []; }
    doesIssuerExists() { return []; }
    doesIssuerForGovExists() { return []; }
    insertUniversity() { return []; }
    downloadDocument() { return []; }
    getAccreditations() { return []; }

}

describe ('AppController', () => {
    let app: INestApplication;
    let appController: AppController;
    let appService: AppService;
    let appFormatter: AppFormatter;
    beforeAll(async () => {
        const module = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService, AppFormatter],
        })
            .overrideProvider(AppService)
            .useValue(new AppServiceMock())
            .compile();
        appController = module.get<AppController>(AppController);
        appService = module.get<AppService>(AppService);
        appFormatter = module.get<AppFormatter>(AppFormatter);

        app = module.createNestApplication();
        await app.init();
    });

    describe('Get routes', () => {

        it(`#/v1/issuers`, () => {
            jest.spyOn(appService, 'getUniversityTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultUniversities));
            return request(app.getHttpServer())
                .get('/trusted-issuers-registry/v1/issuers?page[size]=10')
                .expect(200)
                .expect(
                    {
                        items: testValues.resultUniversities.map((item) => {return {name: item.preferredName, did: item.issuerDID}; }),
                        total: testValues.resultUniversities.length,
                        pageSize: '10',
                        first: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                        prev: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                        next: '/trusted-issuers-registry/v1/issuers?page[after]=1&page[size]=10',
                        last: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=10',
                    },
                );
        });

        it(`#/v1/issuers size of 2 with 4 results`, () => {
            jest.spyOn(appService, 'getUniversityTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultUniversities));
            jest.spyOn(appService, 'getGovTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultGov));
            let it = [...testValues.resultUniversities, ...testValues.resultGov];

            return request(app.getHttpServer())
                .get('/trusted-issuers-registry/v1/issuers?page[size]=2')
                .expect(200)
                .expect(
                    {
                        items: (it.map((item) => {
                            return {name: item.preferredName ?? item.name, did: item.issuerDID};
                        })).slice(0, 2),
                        total: 4,
                        pageSize: '2',
                        first: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=2',
                        prev: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=2',
                        next: '/trusted-issuers-registry/v1/issuers?page[after]=1&page[size]=2',
                        last: '/trusted-issuers-registry/v1/issuers?page[after]=2&page[size]=2',
                    },
                );
        });
        it(`#/v1/issuers invalid page number`, () => {
            jest.spyOn(appService, 'getUniversityTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultUniversities));
            jest.spyOn(appService, 'getGovTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultGov));
            let it = [...testValues.resultUniversities, ...testValues.resultGov];
            return request(app.getHttpServer())
                .get('/trusted-issuers-registry/v1/issuers?page[size]=2&page[after]=3')
                .expect(400)
                .expect(
                    (res) => {
                                const resp = JSON.parse(res.text);
                                expect(resp.message).toEqual('invalid page number');
                            },
                );
        });

        it(`#/v1/issuers/:did`, () => {
            jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => true);
            jest.spyOn(appService, 'doesIssuerForGovExists').mockImplementation(() => false);
            jest.spyOn(appService, 'getIssuer').mockResolvedValue(testValues.univBody);
            jest.spyOn(appService, 'getDocuments').mockImplementation(() => Promise.all(testValues.issuerResult.documents));
            jest.spyOn(appService, 'downloadDocument').mockResolvedValue(null);
            jest.spyOn(appService, 'getAccreditations').mockResolvedValue(testValues.issuerResult.accreditations);

            return request(app.getHttpServer())
                .get('/trusted-issuers-registry/v1/issuers/testdid')
                .expect(200)
                .expect(
                    [{
                        issuerDID: 'test',
                        alternativeName: 'test',
                        homepage: 'test',
                        escoOrganizationType: 'test',
                        siteLocation: 'test',
                        documents: [ {
                            title: testValues.issuerResult.documents[0].title,
                            documentType: testValues.issuerResult.documents[0].documentType || "",
                            status: testValues.issuerResult.documents[0].status,
                            revision: testValues.issuerResult.documents[0].revision,
                            vcCode: testValues.issuerResult.documents[0].vcCode,
                            dateStart: parseInt(testValues.issuerResult.documents[0].dateStart, 10),
                            body: ''
                        } ],
                        accreditations: [ {
                            targetFramework: "Europass Accreditation Database",
                            targetResource: "https://accreditation.europass.eu/12341455"
                        } ],
                    }]
                );
        });
        it(`#/v1/issuers/:did no issuer found`, () => {
            jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => false);
            jest.spyOn(appService, 'doesIssuerForGovExists').mockImplementation(() => false);
            const did = 'noissuerfound';

            return request(app.getHttpServer())
                .get(`/trusted-issuers-registry/v1/issuers/${did}`)
                .expect(404)
                .expect(
                    (res) => {
                        expect(res.body.message).toEqual(`The format of ${did} parameter is not valid or entity not found`);
                    },
                );
        });
        // it(`#/v1/issuers will fail not found`, () => {
        //     jest.spyOn(appService, 'getUniversityTrustedIssuers').mockImplementation(() => {throw new Error('test'); } );
        //     return request(app.getHttpServer())
        //         .get('/trusted-issuers/universities')
        //         .expect(404)
        //         .expect(
        //             (res) => {
        //                 const resp = JSON.parse(res.text);
        //
        //                 expect(resp.message).toEqual('Besu API not working.');
        //             },
        //         );
        // });
        // it(`/POST universities - create universities - university already exists`, () => {
        //     jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => true );
        //     return request(app.getHttpServer())
        //         .post('/trusted-issuers/universities')
        //         .expect(400)
        //         .expect(
        //             (res) => {
        //                 const resp = JSON.parse(res.text);
        //
        //                 expect(resp.message).toEqual('University already exists!');
        //             },
        //         );
        // });
        // it(`/POST universities - create universities - no priv key found`, () => {
        //     jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => false );
        //     jest.spyOn(appService, 'insertUniversity').mockImplementation(() => {throw new Error('test'); } );
        //     return request(app.getHttpServer())
        //         .post('/trusted-issuers/universities')
        //         .expect(401)
        //         .expect(
        //             (res) => {
        //                 const resp = JSON.parse(res.text);
        //
        //                 expect(resp.message).toEqual('ether key not found');
        //             },
        //         );
        // });
        //
        // test(`/POST universities - create universities - success`, async (done) => {
        //     jest.spyOn(appService, 'doesIssuerExists').mockImplementation(() => false );
        //     jest.spyOn(appService, 'insertUniversity').mockImplementation(async (body: UniversityBody) => Promise.resolve() );
        //     const bodyVar = testValues.univBody;
        //     request( app.getHttpServer())
        //         .post('/trusted-issuers/universities')
        //         .send(bodyVar)
        //         .then(res => {
        //             expect(res.status).toBe(201);
        //             expect(JSON.stringify(res.body)).toBe(JSON.stringify(bodyVar));
        //         });
        //     done();
        //
        // });

    });
    // describe('Governments APIs', () => {
    //
    //     it(`/GET Gov issuers`, () => {
    //         jest.spyOn(appService, 'getGovTrustedIssuers').mockImplementation(() => Promise.all(testValues.resultGov));
    //         return request(app.getHttpServer())
    //             .get('/trusted-issuers/governments')
    //             .expect(200)
    //             .expect(
    //                 testValues.resultGov,
    //             );
    //     });
    //
    //     it(`/GET Gov issuers will fail service not found`, () => {
    //         jest.spyOn(appService, 'getGovTrustedIssuers').mockImplementation(() => {throw new Error('test'); } );
    //         return request(app.getHttpServer())
    //             .get('/trusted-issuers/governments')
    //             .expect(404)
    //             .expect(
    //                 (res) => {
    //                     const resp = JSON.parse(res.text);
    //
    //                     expect(resp.message).toEqual('Besu API not working.');
    //                 },
    //             );
    //     });
    //
    // });
    afterAll(async () => {
        await app.close();
    });
});
