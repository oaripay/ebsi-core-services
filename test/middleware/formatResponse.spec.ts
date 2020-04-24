/* eslint-disable no-underscore-dangle */

import httpMocks from "node-mocks-http";
import applyPaginationFormat from "../../src/middleware/formatResponse";
import { mockedPosts } from "../auxAPICalls";
import { PaginateResult } from "../../src/utils";

const next = () => {};
describe("formatResponse middleware test suite", () => {
  it("returns the default pagination format", () => {
    expect.assertions(1);
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const req = httpMocks.createRequest({
      method: "GET",
      baseUrl: "/attributes",
      originalUrl: "/attributes?did=did:ebsi:0x04",
    });

    const expectedResult: PaginateResult = {
      items: [
        { id: 1, title: "One", author: "I" },
        { id: 2, title: "two", author: "I" },
        { id: 3, title: "three", author: "I" },
        { id: 4, title: "Four", author: "I" },
        { id: 5, title: "Five", author: "I" },
        { id: 6, title: "Six", author: "I" },
        { id: 7, title: "Seven", author: "I" },
        { id: 8, title: "Eight", author: "I" },
        { id: 9, title: "Nine", author: "I" },
        { id: 10, title: "Ten", author: "I" },
      ],
      total: 10,
      pageSize: 10,
      links: {
        first: "/attributes?page[after]=0&page[size]=10",
        prev: "/attributes?page[after]=0&page[size]=10",
        next: "/attributes?page[after]=10&page[size]=10",
        last: "/attributes?page[after]=10&page[size]=10",
      },
    };

    res.on("end", () => {
      const result = JSON.parse(res._getData());
      expect(result).toMatchObject(expectedResult);
    });
    applyPaginationFormat(mockedPosts, req, res, next);
  });

  it("returns the first 5 elements when setting page[size]=5", () => {
    expect.assertions(1);
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const req = httpMocks.createRequest({
      method: "GET",
      baseUrl: "/attributes",
      originalUrl: "/attributes?did=did:ebsi:0x04&page[size]=5",
    });

    const expectedResult: PaginateResult = {
      items: [
        { id: 1, title: "One", author: "I" },
        { id: 2, title: "two", author: "I" },
        { id: 3, title: "three", author: "I" },
        { id: 4, title: "Four", author: "I" },
        { id: 5, title: "Five", author: "I" },
      ],
      total: 10,
      pageSize: 5,
      links: {
        first: "/attributes?page[after]=0&page[size]=5",
        prev: "/attributes?page[after]=0&page[size]=5",
        next: "/attributes?page[after]=4&page[size]=5",
        last: "/attributes?page[after]=10&page[size]=5",
      },
    };

    res.on("end", () => {
      const result = JSON.parse(res._getData());
      expect(result).toMatchObject(expectedResult);
    });
    applyPaginationFormat(mockedPosts, req, res, next);
  });

  it("returns the next 5 elements when using the next parameter", () => {
    expect.assertions(1);
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const req = httpMocks.createRequest({
      method: "GET",
      baseUrl: "/attributes",
      originalUrl: "/attributes?did=did:ebsi:0x04&page[after]=4&page[size]=5",
    });

    const expectedResult: PaginateResult = {
      items: [
        { id: 6, title: "Six", author: "I" },
        { id: 7, title: "Seven", author: "I" },
        { id: 8, title: "Eight", author: "I" },
        { id: 9, title: "Nine", author: "I" },
        { id: 10, title: "Ten", author: "I" },
      ],
      total: 10,
      pageSize: 5,
      links: {
        first: "/attributes?page[after]=0&page[size]=5",
        prev: "/attributes?page[after]=5&page[size]=5",
        next: "/attributes?page[after]=10&page[size]=5",
        last: "/attributes?page[after]=10&page[size]=5",
      },
    };

    res.on("end", () => {
      const result = JSON.parse(res._getData());
      expect(result).toMatchObject(expectedResult);
    });
    applyPaginationFormat(mockedPosts, req, res, next);
  });

  it("returns the previous 5 elements when using the before parameter", () => {
    expect.assertions(1);
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const req = httpMocks.createRequest({
      method: "GET",
      baseUrl: "/attributes",
      originalUrl: "/attributes?did=did:ebsi:0x04&page[before]=5&page[size]=5",
    });

    const expectedResult: PaginateResult = {
      items: [
        { id: 1, title: "One", author: "I" },
        { id: 2, title: "two", author: "I" },
        { id: 3, title: "three", author: "I" },
        { id: 4, title: "Four", author: "I" },
        { id: 5, title: "Five", author: "I" },
      ],
      total: 10,
      pageSize: 5,
      links: {
        first: "/attributes?page[after]=0&page[size]=5",
        prev: "/attributes?page[after]=0&page[size]=5",
        next: "/attributes?page[after]=4&page[size]=5",
        last: "/attributes?page[after]=10&page[size]=5",
      },
    };

    res.on("end", () => {
      const result = JSON.parse(res._getData());
      expect(result).toMatchObject(expectedResult);
    });
    applyPaginationFormat(mockedPosts, req, res, next);
  });

  it("returns the first 5 elements when offset is less than 0", () => {
    expect.assertions(1);
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });

    const req = httpMocks.createRequest({
      method: "GET",
      baseUrl: "/attributes",
      originalUrl: "/attributes?did=did:ebsi:0x04&page[before]=-3&page[size]=5",
    });

    const expectedResult: PaginateResult = {
      items: [
        { id: 1, title: "One", author: "I" },
        { id: 2, title: "two", author: "I" },
        { id: 3, title: "three", author: "I" },
        { id: 4, title: "Four", author: "I" },
        { id: 5, title: "Five", author: "I" },
      ],
      total: 10,
      pageSize: 5,
      links: {
        first: "/attributes?page[after]=0&page[size]=5",
        prev: "/attributes?page[after]=0&page[size]=5",
        next: "/attributes?page[after]=4&page[size]=5",
        last: "/attributes?page[after]=10&page[size]=5",
      },
    };

    res.on("end", () => {
      const result = JSON.parse(res._getData());
      expect(result).toMatchObject(expectedResult);
    });
    applyPaginationFormat(mockedPosts, req, res, next);
  });
});
