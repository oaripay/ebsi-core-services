import { join } from "node:path";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { Controller, Get, Header } from "@nestjs/common";
import { Accepts } from "@ebsiint-api/shared";

@Controller()
export class OpenApiController {
  private spec: string;

  constructor() {
    this.spec = readFileSync(
      join(import.meta.dirname, "../../../api/openapi.yaml"),
      "utf8",
    );
  }

  @Get("openapi.yaml")
  @Accepts("application/openapi+yaml")
  @Header("Content-Type", "application/openapi+yaml")
  getYaml() {
    return this.spec;
  }

  @Get("openapi.json")
  @Accepts("application/openapi+json")
  @Header("Content-Type", "application/openapi+json")
  getJson() {
    return parse(this.spec) as JSON;
  }
}

export default OpenApiController;
