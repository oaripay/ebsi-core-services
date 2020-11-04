const {accounts, contract, web3} = require("@openzeppelin/test-environment");

const Tir = contract.fromArtifact("Tir");
const Pagination = contract.fromArtifact("Pagination");

describe("pagination", () => {
  const resIssuers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  it("should work with page==1", async () => {
    expect.assertions(42);
    const [acc1] = accounts;

    const myLibrary = await Pagination.new();
    await Tir.detectNetwork();
    await Tir.link("Pagination", myLibrary.address);
    const implV0 = await Tir.new({from: acc1});

    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await implV0.insertIssuer(did, inputdata, {
        from: acc1,
      });
    }

    const r = await implV0.getIssuers.call(1, 2, {
      from: acc1,
    });
    expect(r.items).toHaveLength(2);
    expect(r).toMatchObject({
      items: resIssuers.slice(0, 2),
    });
    expect(r.total.toString()).toStrictEqual("11");
    expect(r.howMany.toString()).toStrictEqual("2");
    expect(r.prev.toString()).toStrictEqual("1");
    expect(r.next.toString()).toStrictEqual("2");
    const r1 = await implV0.getIssuers.call(1, 42, {
      from: acc1,
    });
    expect(r1.items).toHaveLength(11);
    expect(r1).toMatchObject({
      items: resIssuers,
    });
    expect(r1.total.toString()).toStrictEqual("11");
    expect(r1.howMany.toString()).toStrictEqual("11");
    expect(r1.prev.toString()).toStrictEqual("1");
    expect(r1.next.toString()).toStrictEqual("1");

    const r4 = await implV0.getIssuers.call(1, 11, {
      from: acc1,
    });
    expect(r4.items).toHaveLength(11);
    expect(r4).toMatchObject({
      items: resIssuers,
    });
    expect(r4.total.toString()).toStrictEqual("11");
    expect(r4.howMany.toString()).toStrictEqual("11");
    expect(r4.prev.toString()).toStrictEqual("1");
    expect(r4.next.toString()).toStrictEqual("1");

    const r2 = await implV0.getIssuers.call(1, 10, {
      from: acc1,
    });
    expect(r2.items).toHaveLength(10);
    expect(r2).toMatchObject({
      items: resIssuers.slice(0, 10),
    });

    expect(r2.total.toString()).toStrictEqual("11");
    expect(r2.howMany.toString()).toStrictEqual("10");
    expect(r2.prev.toString()).toStrictEqual("1");
    expect(r2.next.toString()).toStrictEqual("2");

    const r3 = await implV0.getIssuers.call(1, 12, {
      from: acc1,
    });
    expect(r3.items).toHaveLength(11);
    expect(r3).toMatchObject({
      items: resIssuers,
    });
    expect(r3.total.toString()).toStrictEqual("11");
    expect(r3.howMany.toString()).toStrictEqual("11");
    expect(r3.prev.toString()).toStrictEqual("1");
    expect(r3.next.toString()).toStrictEqual("1");

    const r5 = await implV0.getIssuers.call(1, 21, {
      from: acc1,
    });
    expect(r5.items).toHaveLength(11);
    expect(r5).toMatchObject({
      items: resIssuers,
    });
    expect(r5.total.toString()).toStrictEqual("11");
    expect(r5.howMany.toString()).toStrictEqual("11");
    expect(r5.prev.toString()).toStrictEqual("1");
    expect(r5.next.toString()).toStrictEqual("1");
    const r6 = await implV0.getIssuers.call(1, 23, {
      from: acc1,
    });
    expect(r6.items).toHaveLength(11);
    expect(r6).toMatchObject({
      items: resIssuers,
    });
    expect(r6.total.toString()).toStrictEqual("11");
    expect(r6.howMany.toString()).toStrictEqual("11");
    expect(r6.prev.toString()).toStrictEqual("1");
    expect(r6.next.toString()).toStrictEqual("1");
  });
  it("should work with page>1 and pagesize eq total", async () => {
    expect.assertions(12);
    const [acc1] = accounts;

    const myLibrary = await Pagination.new();
    await Tir.detectNetwork();
    await Tir.link("Pagination", myLibrary.address);
    const implV0 = await Tir.new({from: acc1});

    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await implV0.insertIssuer(did, inputdata, {
        from: acc1,
      });
    }
    // page = 1 and pagesize is equal to the total
    const r = await implV0.getIssuers.call(2, 11, {
      from: acc1,
    });
    expect(r.items).toHaveLength(0);
    expect(r).toMatchObject({
      items: [],
    });
    expect(r.total.toString()).toStrictEqual("11");
    expect(r.howMany.toString()).toStrictEqual("0");
    expect(r.prev.toString()).toStrictEqual("1");
    expect(r.next.toString()).toStrictEqual("1");

    const r1 = await implV0.getIssuers.call(5, 11, {
      from: acc1,
    });
    expect(r1.items).toHaveLength(0);
    expect(r1).toMatchObject({
      items: [],
    });
    expect(r1.total.toString()).toStrictEqual("11");
    expect(r1.howMany.toString()).toStrictEqual("0");
    expect(r1.prev.toString()).toStrictEqual("1");
    expect(r1.next.toString()).toStrictEqual("1");
  });
  it("should work with page>1 and pagesize eq total and round item numbers", async () => {
    expect.assertions(6);
    const [acc1] = accounts;

    const myLibrary = await Pagination.new();
    await Tir.detectNetwork();
    await Tir.link("Pagination", myLibrary.address);
    const implV0 = await Tir.new({from: acc1});

    for (let i = 0; i < 12; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await implV0.insertIssuer(did, inputdata, {
        from: acc1,
      });
    }
    // page = 1 and pagesize is equal to the total
    const r = await implV0.getIssuers.call(4, 3, {
      from: acc1,
    });
    expect(r.items).toHaveLength(3);
    expect(r).toMatchObject({
      items: ["9", "10", "11"],
    });
    expect(r.total.toString()).toStrictEqual("12");
    expect(r.howMany.toString()).toStrictEqual("3");
    expect(r.prev.toString()).toStrictEqual("3");
    expect(r.next.toString()).toStrictEqual("4");
  });

  it("should work with page=>X and pagesize less than total", async () => {
    expect.assertions(54);
    const [acc1] = accounts;

    const myLibrary = await Pagination.new();
    await Tir.detectNetwork();
    await Tir.link("Pagination", myLibrary.address);
    const implV0 = await Tir.new({from: acc1});

    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await implV0.insertIssuer(did, inputdata, {
        from: acc1,
      });
    }
    // page = 3 and pagesize 2
    const r1 = await implV0.getIssuers.call(3, 2, {
      from: acc1,
    });
    expect(r1.items).toHaveLength(2);
    expect(r1).toMatchObject({
      items: resIssuers.slice(4, 6),
    });
    expect(r1.total.toString()).toStrictEqual("11");
    expect(r1.howMany.toString()).toStrictEqual("2");
    expect(r1.prev.toString()).toStrictEqual("2");
    expect(r1.next.toString()).toStrictEqual("4");
    // page = 1 and pagesize 10
    const r2 = await implV0.getIssuers.call(1, 10, {
      from: acc1,
    });
    expect(r2.items).toHaveLength(10);
    expect(r2).toMatchObject({
      items: resIssuers.slice(0, 10),
    });
    expect(r2.total.toString()).toStrictEqual("11");
    expect(r2.howMany.toString()).toStrictEqual("10");
    expect(r2.prev.toString()).toStrictEqual("1");
    expect(r2.next.toString()).toStrictEqual("2");
    // page = 5 and pagesize 2
    const r3 = await implV0.getIssuers.call(5, 2, {
      from: acc1,
    });
    expect(r3.items).toHaveLength(2);
    expect(r3).toMatchObject({
      items: resIssuers.slice(8, 10),
    });
    expect(r3.total.toString()).toStrictEqual("11");
    expect(r3.howMany.toString()).toStrictEqual("2");
    expect(r3.prev.toString()).toStrictEqual("4");
    expect(r3.next.toString()).toStrictEqual("6");
    // page = 6 and pagesize 2
    const r4 = await implV0.getIssuers.call(6, 2, {
      from: acc1,
    });
    expect(r4.items).toHaveLength(1);
    expect(r4).toMatchObject({
      items: resIssuers.slice(10),
    });
    expect(r4.total.toString()).toStrictEqual("11");
    expect(r4.howMany.toString()).toStrictEqual("1");
    expect(r4.prev.toString()).toStrictEqual("5");
    expect(r4.next.toString()).toStrictEqual("6");
    // page = 6565564 and pagesize 2
    const r5 = await implV0.getIssuers.call(6565564, 2, {
      from: acc1,
    });
    expect(r5.items).toHaveLength(0);
    expect(r5).toMatchObject({
      items: [],
    });
    expect(r5.total.toString()).toStrictEqual("11");
    expect(r5.howMany.toString()).toStrictEqual("0");
    expect(r5.prev.toString()).toStrictEqual("6");
    expect(r5.next.toString()).toStrictEqual("6");
    // page = 3 and pagesize 3
    const r6 = await implV0.getIssuers.call(3, 3, {
      from: acc1,
    });
    expect(r6.items).toHaveLength(3);
    expect(r6).toMatchObject({
      items: resIssuers.slice(6, 9),
    });
    expect(r6.total.toString()).toStrictEqual("11");
    expect(r6.howMany.toString()).toStrictEqual("3");
    expect(r6.prev.toString()).toStrictEqual("2");
    expect(r6.next.toString()).toStrictEqual("4");
    // page = 65456465 and pagesize 564646545645
    const r7 = await implV0.getIssuers.call(65456465, 50, {
      from: acc1,
    });
    expect(r7.items).toHaveLength(0);
    expect(r7).toMatchObject({
      items: [],
    });
    expect(r7.total.toString()).toStrictEqual("11");
    expect(r7.howMany.toString()).toStrictEqual("0");
    expect(r7.prev.toString()).toStrictEqual("1");
    expect(r7.next.toString()).toStrictEqual("1");
    // page = 3 and pagesize 3
    const r8 = await implV0.getIssuers.call(2, 3, {
      from: acc1,
    });
    expect(r8.items).toHaveLength(3);
    expect(r8).toMatchObject({
      items: resIssuers.slice(3, 6),
    });
    expect(r8.total.toString()).toStrictEqual("11");
    expect(r8.howMany.toString()).toStrictEqual("3");
    expect(r8.prev.toString()).toStrictEqual("1");
    expect(r8.next.toString()).toStrictEqual("3");
    // page = 3 and pagesize 3
    const r9 = await implV0.getIssuers.call(4, 3, {
      from: acc1,
    });
    expect(r9.items).toHaveLength(2);
    expect(r9).toMatchObject({
      items: resIssuers.slice(9, 11),
    });
    expect(r9.total.toString()).toStrictEqual("11");
    expect(r9.howMany.toString()).toStrictEqual("2");
    expect(r9.prev.toString()).toStrictEqual("3");
    expect(r9.next.toString()).toStrictEqual("4");
  });
});
