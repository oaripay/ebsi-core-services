import { isExpired } from "./notifications.utils";

describe("validators", () => {
  describe("isExpired", () => {
    it("should return true for yesterday date, it has expired", () => {
      expect.assertions(1);
      const date = new Date();
      const yesterday = new Date(date.getTime() - 1000 * 60 * 60 * 24);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isExpired(yesterday.toString())).toBe(true);
    });

    it("should return true for now date, it has already expired", () => {
      expect.assertions(1);
      const date = new Date();
      expect(isExpired(date.toString())).toBe(true);
    });

    it("should return false for tomorrow date, it has not expired", () => {
      expect.assertions(1);
      const date = new Date();
      const tomorrow = new Date(date.getTime() + 1000 * 60 * 60 * 24);
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isExpired(tomorrow.toString())).toBe(false);
    });
  });
});
