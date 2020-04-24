import express from "express";
import qs from "qs";
import { paginate } from "../utils";

interface QueryPage {
  size: number;
  before?: string;
  after?: string;
}

const paginateArray = (
  data: any[],
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  const { baseUrl, originalUrl } = req;
  const parsed = qs.parse(originalUrl);

  if (parsed.page) {
    const { size, before, after } = parsed.page as QueryPage;
    // when before is specified, calls the previous elements page
    if (before) {
      const formatedJson = paginate(
        data,
        baseUrl,
        size,
        // offset: starting at one page size before the element specified
        +before - size > 0 ? +before - size : 0
      );
      res.type("application/json");
      res.json(formatedJson);
      next();
    }
    // when after is specified, calls the next elements page
    if (after) {
      const formatedJson = paginate(
        data,
        baseUrl,
        size,
        // offset: starting at one element after the specified
        +after + 1
      );
      res.type("application/json");
      res.json(formatedJson);
      next();
    }
    // when size is specified without a specific page
    const formatedJson = paginate(data, baseUrl, size);
    res.type("application/json");
    res.json(formatedJson);
    next();
  }
  // default behaviour when no page is specified
  const formatedJson = paginate(data, baseUrl);
  res.type("application/json");
  res.json(formatedJson);
  next();
};

export default paginateArray;
