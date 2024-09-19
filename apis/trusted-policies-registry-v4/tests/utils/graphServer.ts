import { setupServer } from "msw/node";
import { graphql, HttpResponse } from "msw";
import { dummyPolicies, dummyUsers } from "./data.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { Policy_filter, User_filter } from "../../.graphclient/index.js";

export const graphServer = setupServer(
  graphql.query("GetPolicyNames", ({ variables }) => {
    const { skip, pagesize, where } = variables as {
      skip: number;
      pagesize: number;
      where: Policy_filter;
    };

    return HttpResponse.json({
      data: {
        policies: dummyPolicies
          .filter((p) => {
            if (
              where &&
              where.status !== undefined &&
              p.status !== where.status
            )
              return false;
            return true;
          })
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
    const { skip, pagesize, where } = variables as {
      skip: number;
      pagesize: number;
      where: User_filter;
    };

    return HttpResponse.json({
      data: {
        users: dummyUsers
          .filter((u) => {
            if (
              where &&
              where.attributes_contains &&
              where.attributes_contains.length > 0 &&
              !u.attributes.includes(where.attributes_contains[0]!)
            )
              return false;
            return true;
          })
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
