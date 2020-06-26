const Registry = artifacts.require('EBSIApplicationRegistry.sol');
const {
    BN,
    constants,
    expectEvent,
    expectRevert
} = require("openzeppelin-test-helpers");
const Web3 = require('web3');

let gasUsedTotal = 0;
let gasUsedRecords = [];

function recordGasUsed(_tx, _label) {
    gasUsedTotal += _tx.receipt.gasUsed;
    gasUsedRecords.push(
        String(_label + " | GasUsed: " + _tx.receipt.gasUsed).padStart(60)
    );
}

function printGasUsed() {
    console.log("------------------------------------------------------------");
    for (let i = 0; i < gasUsedRecords.length; ++i) {
        console.log(gasUsedRecords[i]);
    }
    console.log(String("Total: " + gasUsedTotal).padStart(60));
    console.log("------------------------------------------------------------");
}

contract("Registry", accounts => {
    let registry;
    let operator, owner, secondAddress;
    before(async () => {
        this.operator = accounts[0];
        this.owner = accounts[0];
        // random non-owner address
        this.secondAddress = accounts[1];
    });
    beforeEach(async () => {
        this.registry = await Registry.new();
    });

    after(async () => {
        printGasUsed();
    });


    //
    // it("add new application if called by operator", async () => {
    //     const tx = await this.registry.registerApp('public-key', 'test-application');
    //     recordGasUsed(tx, "Add new Application");
    //     expectEvent(tx,'ApplicationRegistered', {
    //         index: new BN(1),
    //         key: Web3.utils.keccak256('test-application')
    //     });
    //
    //     const result = await this.registry.getApplicationByKey(Web3.utils.keccak256('test-application'));
    //     assert.equal(result[0], 'test-application');
    //     assert.equal(result[1], 'public-key');
    //
    //     // assert the index is set in registry
    //     const indexes = await this.registry.getApplicationKeys();
    //     assert.equal((indexes[0]).toNumber(), (new BN(1)).toNumber());
    //
    //
    //     const pubKeyResult = await this.registry.getApplicationPublicKey('test-application');
    //
    //     assert.equal(pubKeyResult, 'public-key');
    // });
    //
    // it("add 2 new applications and access one to eachother", async () => {
    //     const tx1 = await this.registry.registerApp('public-key', 'test-application');
    //     const tx2 = await this.registry.registerApp('public-key2', 'test-application2');
    //     recordGasUsed(tx1, "Add 1st application");
    //     recordGasUsed(tx2, "Add 2nd application");
    //     expectEvent(tx1,'ApplicationRegistered', {
    //         index: new BN(1),
    //         key: Web3.utils.keccak256('test-application')
    //     });
    //     expectEvent(tx2,'ApplicationRegistered', {
    //         index: new BN(2),
    //         key: Web3.utils.keccak256('test-application2')
    //     });
    //
    //     const tx3 = await this.registry.addNewAuthorization('test-application', 'test-application2');
    //
    //     recordGasUsed(tx3, "add test-application 2 to test-application");
    //     expectEvent(tx3,'AuthorizationAdded', {
    //         index1: new BN(1),
    //         index2: new BN(2)
    //     });
    //
    //     const result = await this.registry.getAuthorizedAppsByKey(Web3.utils.keccak256('test-application'));
    //     // console.log(result);
    //     assert.equal(result[0], 'test-application2');
    //
    //
    // });
    //
    //
    // it("update the public key and name of an app", async () => {
    //     const tx1 = await this.registry.registerApp('public-key', 'test-application');
    //     // update public key
    //     const tx2 = await this.registry.updateApp('test-application', 'test-application', 'public-key2');
    //     recordGasUsed(tx1, "Add 1st application");
    //     recordGasUsed(tx2, "Update 1st application");
    //
    //     expectEvent(tx1,'ApplicationRegistered', {
    //         index: new BN(1),
    //         key: Web3.utils.keccak256('test-application')
    //     });
    //     expectEvent(tx2,'ApplicationUpdated', {
    //         index: new BN(1),
    //     });
    //
    //     const result = await this.registry.getApplicationByKey(Web3.utils.keccak256('test-application'));
    //     assert.equal(result[0], 'test-application');
    //     assert.equal(result[1], 'public-key2');
    //
    //
    //     // assert the index is set in registry
    //     const indexes = await this.registry.getApplicationKeys();
    //     assert.equal(indexes.length, 1);
    //     assert.equal((indexes[0]).toNumber(), (new BN(1)).toNumber());
    //
    //
    //     // update app name
    //     const tx3 = await this.registry.updateApp('test-application', 'test-application2', 'public-key3');
    //     recordGasUsed(tx3, "Update 1st application");
    //
    //     expectEvent(tx3,'ApplicationUpdated', {
    //         index: new BN(1),
    //     });
    //
    //     // assert the index is set in registry
    //     const indexesAfterSecondUpdate = await this.registry.getApplicationKeys();
    //     assert.equal(indexesAfterSecondUpdate.length, 1);
    //     assert.equal((indexesAfterSecondUpdate[0]).toNumber(), (new BN(1)).toNumber());
    //
    //     const resultAfterSecondUpdate = await this.registry.getApplicationByKey(Web3.utils.keccak256('test-application2'));
    //     assert.equal(resultAfterSecondUpdate[0], 'test-application2');
    //     assert.equal(resultAfterSecondUpdate[1], 'public-key3');
    //
    // });
    //
    //
    // it("add 3 new applications and access one to eachother and delete the middle one and the middle access to the first one", async () => {
    //     const tx1 = await this.registry.registerApp('public-key', 'test-application');
    //     const tx2 = await this.registry.registerApp('public-key2', 'test-application2');
    //     const tx3 = await this.registry.registerApp('public-key3', 'test-application3');
    //     recordGasUsed(tx1, "Add 1st application");
    //     recordGasUsed(tx2, "Add 2nd application");
    //     recordGasUsed(tx3, "Add 3rd application");
    //     expectEvent(tx1,'ApplicationRegistered', {
    //         index: new BN(1),
    //         key: Web3.utils.keccak256('test-application')
    //     });
    //     expectEvent(tx2,'ApplicationRegistered', {
    //         index: new BN(2),
    //         key: Web3.utils.keccak256('test-application2')
    //     });
    //     expectEvent(tx3,'ApplicationRegistered', {
    //         index: new BN(3),
    //         key: Web3.utils.keccak256('test-application3')
    //     });
    //
    //     await this.registry.addNewAuthorization('test-application', 'test-application2');
    //     await this.registry.addNewAuthorization('test-application', 'test-application3');
    //
    //     const resultAuthInitial = await this.registry.getAuthorizedAppsByKey(Web3.utils.keccak256('test-application'));
    //     assert.equal(resultAuthInitial.length, 2);
    //     assert.equal(resultAuthInitial[0], 'test-application2');
    //     assert.equal(resultAuthInitial[1], 'test-application3');
    //
    //     await this.registry.registerApp('public-key4', 'test-application4');
    //     await this.registry.addNewAuthorization('test-application', 'test-application4');
    //     const tx4 = await this.registry.deleteApp('test-application2')
    //     expectEvent(tx4,'ApplicationDeleted', {
    //         index: new BN(2),
    //         key: Web3.utils.keccak256('test-application2')
    //     });
    //
    //     expectEvent(tx4,'AuthorizationDeleted', {
    //         index1: new BN(1),
    //         index2: new BN(2),
    //     });
    //
    //     const resultAuthFinal = await this.registry.getAuthorizedAppsByKey(Web3.utils.keccak256('test-application'));
    //     assert.equal(resultAuthFinal.length, 2);
    //     assert.equal(resultAuthFinal[0], 'test-application4');
    //     const indexes = await this.registry.getApplicationKeys();
    //     assert.equal(indexes.length, 3);
    //     assert.equal(indexes[1].toNumber(), 4);
    // });
    //

    it("throws if register is called by a user that is not a operator", async () => {

        try {
         await this.registry.registerApp('test', 'test', {from: this.secondAddress});

            // let rawMessageData = error.receipt.revertReason.slice(2);
            // const strLen = parseInt(rawMessageData.slice(8 + 64, 8 + 128), 16);
            // const reasonCodeHex = rawMessageData.slice(8 + 128, 8 + 128 + (strLen * 2));
            // const reason = web3.utils.hexToAscii('0x' + reasonCodeHex);
            // assert.equal(reason, 'OperatorRole: caller does not have the Operator role2');
            // this.registry.registerApp('test', 'test', {from: this.secondAddress}).then(function (result) {
            //     expectRevert(result, 'test');
            // }).catch(function(error) {
            //     let rawMessageData = e.receipt.revertReason.slice(2);
            //     const strLen = parseInt(rawMessageData.slice(8 + 64, 8 + 128), 16);
            //     const reasonCodeHex = rawMessageData.slice(8 + 128, 8 + 128 + (strLen * 2));
            //     const reason = web3.utils.hexToAscii('0x' + reasonCodeHex);
            //     assert.equal(reason, 'OperatorRole: caller does not have the Operator role2');
            // });
        } catch (e) {
            let reason;
            if (e.reason !== undefined) {
                // in ganache we have reason
                reason = e.reason;
            } else {
                let rawMessageData = e.receipt.revertReason.slice(2);
                const strLen = parseInt(rawMessageData.slice(8 + 64, 8 + 128), 16);
                const reasonCodeHex = rawMessageData.slice(8 + 128, 8 + 128 + (strLen * 2));
                reason = web3.utils.hexToAscii('0x' + reasonCodeHex);
            }


            assert.equal(reason, 'OperatorRole: caller does not have the Operator role');
       }
    });




});
