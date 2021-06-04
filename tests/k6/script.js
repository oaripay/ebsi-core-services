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
  group("/notifications/v1/health", () => {
    const url = `${BASE_URL}/notifications/v1/health`;
    const request = http.get(url);
    check(request, {
      Success: (r) => r.status === 200,
    });
  });
}
