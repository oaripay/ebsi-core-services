// @ts-nocheck
import http from "k6/http";
import { group, check } from "k6";

const hostname = __ENV.API_HOSTNAME || "0.0.0.0";

const BASE_URL = `http://${hostname}:3000`;

export const options = {
  max_vus: 100,
  vus: 100,
  stages: [
    { duration: "30s", target: 10 },
    { duration: "4m", target: 100 },
    { duration: "30s", target: 0 },
  ],
};

export default function loadTesting() {
  group("/storage/v3/stores", () => {
    const url = `${BASE_URL}/storage/v3/stores`;
    const request = http.get(url);
    check(request, {
      Success: (r) => r.status === 200,
    });
  });
}
