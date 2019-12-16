const EBSIAppRegistry = artifacts.require('EBSIApplicationRegistry');

module.exports = async (deployer, network) => {


    console.log('Deploying EBSI App Registry on the network');

    await deployer.deploy(EBSIAppRegistry)

    console.log('Registry Deployed at ' + EBSIAppRegistry.address)


    let registryInstance = await EBSIAppRegistry.deployed();


    let app = {
        name: 'ebsi-wallet',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVySVZhMmdvNTBnU3M1cENERjV3WStmYjUrVHpUenlDVwpBOVI4TGp1dTVYenozSUxoM1UvCk50a0NzS3I1Z2pYdUhNVlhka000eVdQMGJ5NTlFb0dYeWp3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t',
    }

    console.log('adding app ', app.name)

    registryInstance.addApplication(app.pubKey, app.name)

    app = {
        name: 'ebsi-notary',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVzM2hTVW9NQkZZRkNKd2ZZeUJJdmFhUWVLajF5V0h1VwpFOW1rZXE4Q3VKbWYrYkhLU1hrdjV2aDNsZGRQS1hlak5RWmM0SG9RcjBEMDhGREpCUVBvY0E9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='
    }
    console.log('adding app ', app.name)

    registryInstance.addApplication(app.pubKey, app.name)


    app = {
        name: 'ebsi-diploma',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMYTIvWHFPK2Ntc0hoMENMZVJLWFp3VHlKSjEwQzR4Tgo0MWVPTFIraUpEOXhQUy8KT28xN3RSOHNRQUh6aklicWVKUWRoS0VJN1gwZTY1K1licmRpQk9nPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t'
    }
    console.log('adding app ', app.name)

    registryInstance.addApplication(app.pubKey, app.name)

    app = {
        name: 'eca',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVHWXZGNDFuZm5KenlnWWFmZzlSMjB2TnhSejU1elFoaQpJb3hENEpwZG9JZm9yazFXN0wxTzhjKzNabVgrOU91ZXZETGJMQ1A1L2hnSTh2RHBjYUdzUEE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='
    }
    console.log('adding app ', app.name)
    registryInstance.addApplication(app.pubKey, app.name)
    app = {
        name: 'taxud',
        pubKey: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVRMkNoUlgrZzhkbDd6RzBvdEZJdkdBQzl1ai9vMW1vbwpCVkNaN1hJZmNVR1Y5M0JHdDVDeG1LWjNNcU5qaDYzdm5ENVExa2s3NkgzNFhPWGlWaTRmakE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0='

    }
    console.log('adding app ', app.name)

    registryInstance.addApplication(app.pubKey, app.name)



    console.log ('adding access from all to all')

    let apps = ['ebsi-wallet', 'ebsi-notary', 'ebsi-diploma', 'eca', 'taxud'];

    for(i=0; i<apps.length; i++) {
        for(j=0; j<apps.length; j++) {
            if (i===j) continue;
            console.log('adding on ', apps[i], ' ', apps[j]);
            await registryInstance.addNewAuthorization(apps[i], apps[j], true);
        }
    }


    await registryInstance.transferOwnership('0x5d6bF64482C652C7C81197D3c185FC330Ca84b42');
}
