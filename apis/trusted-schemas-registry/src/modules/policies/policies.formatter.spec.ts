import type { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";

import { describe, expect, it } from "vitest";

import type { PoliciesService } from "./policies.service.js";

import { formatPolicies, formatRevisions } from "./policies.formatter.js";

describe("formatPolicies", () => {
  const policies = {
    howMany: 3n,
    items: ["policy-1:with/specialChars", "policy-2", "policy-3"],
    next: 3n,
    prev: 1n,
    total: 42n,
  } as Awaited<ReturnType<SchemaSCRegistry["getPolicies"]>>;

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 3;
    const pageSize = 2;

    expect(formatPolicies(policies, page, pageSize, "")).toStrictEqual({
      items: [
        {
          href: `/${encodeURIComponent("policy-1:with/specialChars")}`,
          policyId: "policy-1:with/specialChars",
        },
        {
          href: "/policy-2",
          policyId: "policy-2",
        },
        {
          href: "/policy-3",
          policyId: "policy-3",
        },
      ],
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=21&page[size]=${pageSize}`,
        next: `?page[after]=${page + 1}&page[size]=${pageSize}`,
        prev: `?page[after]=${page - 1}&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: 42,
    });
  });
});

describe("formatRevisions", () => {
  // As returned by getPolicyRevisions
  const revisions: Awaited<ReturnType<PoliciesService["getPolicyRevisions"]>> =
    {
      items: [
        {
          hash: "0x18e1fa7cff7dd3862d81dae46f460ec063263913659be774dfc81fd4898db8d8",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a226130303162363835363465313734633033313130353735353932646337376431227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0x40571838c18b0e83db06d167211279b437e0becc999309be2de54ccc7b8d096e",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a226138656165343864333739633339376230653730343962636537373934333264227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0x2153bbe9b2d431b353277fcb266c75217445ee308cd046ce44493624394f9f47",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223766386461646466613439393630393266326664663939323737663839326634227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0xa0bed82e0b686622d123b90ee2eeead3ce1b7ce93006707790172646c8df4023",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223263323764623338346436356434653362366165363463306465386131623363227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0x4aaa1ada837395517b2727cb75535a542ba7bed77cce92ae36e6e258e867632e",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223436623464613932393139363938343235613137613636663862653261323532227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0x9855fd54b8ad2924b9e080d9c1c3b5fb7de8fe37a5053859d05012e5af0595ed",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223135383233393935376535393933663862626434613131376362386139336262227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0x99f5e8eb1136b916f816af314bd2e4563f3b03c41cd94cba47d9aca1f847fec4",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223634373366323065383966663161353739626335643536656430323739396263227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0xd875c68386da3171435c0192fbd3b0d1459b66fbdbbaf5e79d1aa14e297cbc66",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a226438313033623438623562316235656332353261653236653738373637626633227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0x3e8ebeb70328599f5e7f142b4bfcb65e6ebc1c0a65df3f16474ab26ee0f965b3",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a223437613862623732363333346537336162313730343264363738626261643632227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
        {
          hash: "0x3784f4c6e82fd710b5916319a8fac445c4a2be9fa11385946510e467ee945de6",
          policy:
            "0x7b22616e79223a22416e79206174747269627574652068657265222c2274797065223a2263726564656e7469616c222c2264617461223a226436306231633362656231626430393332653330646163633233626632656436227d",
          policyId: "policy-test-b83c60f6247f964219bae755be62be8f",
        },
      ],
      total: 12,
    };

  it("should use the values returned by the smart contract (except pageSize)", () => {
    expect.assertions(1);

    const page = 1;
    const pageSize = 10;

    expect(formatRevisions(revisions, page, pageSize, "")).toStrictEqual({
      items: revisions.items,
      links: {
        first: `?page[after]=1&page[size]=${pageSize}`,
        last: `?page[after]=2&page[size]=${pageSize}`,
        next: `?page[after]=2&page[size]=${pageSize}`,
        prev: `?page[after]=1&page[size]=${pageSize}`,
      },
      pageSize,
      self: `?page[after]=${page}&page[size]=${pageSize}`,
      total: 12,
    });
  });
});
