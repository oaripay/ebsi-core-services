import moment from "moment";

export const notBeforeDate = ({
  getFieldValue,
}: {
  getFieldValue: (value: string) => any;
}) => ({
  validator() {
    const notBefore = getFieldValue("notBefore");
    const now = moment();
    if (notBefore.diff(now, "days") < 0) {
      return Promise.reject(
        new Error("Please select a date from present or future!")
      );
    }
    return Promise.resolve();
  },
});

export const notAfterDate = ({
  getFieldValue,
}: {
  getFieldValue: (value: string) => any;
}) => ({
  validator() {
    const notBefore = getFieldValue("notBefore");
    const notAfter = getFieldValue("notAfter");
    if (notBefore && notAfter && notBefore.diff(notAfter) > 0) {
      return Promise.reject(new Error("Expire date is less than start date!"));
    }
    return Promise.resolve();
  },
});
