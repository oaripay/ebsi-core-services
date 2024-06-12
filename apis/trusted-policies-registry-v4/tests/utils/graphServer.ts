import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";
import { dummyPolicies, dummyUsers } from "./data.js";

export const graphServer = setupServer(
  graphql.query("GetPolicyNames", ({ variables }) => {
    const { skip, pagesize } = variables as { skip: number; pagesize: number };

    return HttpResponse.json({
      data: {
        policies: dummyPolicies
          .slice(skip, skip + pagesize)
          .map((p) => ({ policyName: p.policyName })),
      },
    });
  }),

  graphql.query("GetPolicy", ({ variables }) => {
    const { policyName } = variables;

    return HttpResponse.json({
      data: {
        policies: dummyPolicies.filter((p) => p.policyName === policyName),
      },
    });
  }),

  graphql.query("GetUsers", ({ variables }) => {
    const { skip, pagesize } = variables as { skip: number; pagesize: number };

    return HttpResponse.json({
      data: {
        users: dummyUsers
          .slice(skip, skip + pagesize)
          .map((u) => ({ id: u.id })),
      },
    });
  }),

  graphql.query("GetUser", ({ variables }) => {
    const { user } = variables;

    return HttpResponse.json({
      data: {
        user: dummyUsers.find((u) => u.id === user),
      },
    });
  }),
);
export default graphServer;
