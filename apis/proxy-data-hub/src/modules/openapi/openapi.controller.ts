import { join } from "node:path";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { Controller, Get, Header } from "@nestjs/common";

@Controller()
export class OpenApiController {
  private spec: string;

  constructor() {
    this.spec = readFileSync(
      join(__dirname, "../../../api/openapi.yaml"),
      "utf8"
    );
  }

  @Get("openapi.yaml")
  @Header("Content-Type", "application/openapi+yaml")
  getYaml() {
    return this.spec;
  }

  @Get("openapi.json")
  @Header("Content-Type", "application/openapi+json")
  getJson() {
    return parse(this.spec) as JSON;
  }
}

export default OpenApiController;
