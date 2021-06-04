import http from "k6/http";
import { group, check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://0.0.0.0:3000";

export const options = {
  max_vus: 100,
  vus: 100,
  stages: [
    { duration: "15s", target: 10 },
    { duration: "2m", target: 100 },
    { duration: "15s", target: 0 },
  ],
};

export default function loadTesting() {
  group("/users-onboarding/v1/authentication-requests", () => {
    const url = `${BASE_URL}/users-onboarding/v1/authentication-requests`;
    const request = http.post(
      url,
      JSON.stringify({
        scope: "ebsi users onboarding",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    check(request, {
      Success: (r) => r.status === 201,
    });
  });
}
