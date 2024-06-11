import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";
import { dummyPolicies, dummyUsers } from "./data.js";

export const graphServer = setupServer(
  graphql.query("getPolicyNames", ({ variables }) => {
    const { skip, pagesize } = variables as { skip: number; pagesize: number };

    return HttpResponse.json({
      data: {
        policies: dummyPolicies
          .slice(skip, skip + pagesize)
          .map((p) => ({ policyName: p.policyName })),
      },
    });
  }),

  graphql.query("getPolicy", ({ variables }) => {
    const { policyName } = variables;

    return HttpResponse.json({
      data: {
        policies: dummyPolicies.filter((p) => p.policyName === policyName),
      },
    });
  }),

  graphql.query("getUsers", ({ variables }) => {
    const { skip, pagesize } = variables as { skip: number; pagesize: number };

    return HttpResponse.json({
      data: {
        users: dummyUsers
          .slice(skip, skip + pagesize)
          .map((u) => ({ id: u.id })),
      },
    });
  }),

  graphql.query("getUser", ({ variables }) => {
    const { user } = variables;

    return HttpResponse.json({
      data: {
        user: dummyUsers.find((u) => u.id === user),
      },
    });
  }),
);
export default graphServer;
