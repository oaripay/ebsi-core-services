import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { Controller, Get, Header } from "@nestjs/common";

@Controller()
export class OpenApiController {
  private spec: string;

  constructor() {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    this.spec = readFileSync(
      join(currentDir, "../../../api/openapi.yaml"),
      "utf8",
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
