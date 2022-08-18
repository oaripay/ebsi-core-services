import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

interface DockerComposeFile {
  services?: {
    [service: string]: {
      image?: string;
    };
  };
}

/**
 * Get docker image tag of a given environment.
 * @param environment
 * @returns string
 */

export function getDockerTag(environment: string): string {
  const dockerConfig = `../../../.ci/${environment}/docker-compose.yml`;
  const filePath = path.resolve(__dirname, dockerConfig);

  if (!fs.existsSync(filePath)) return "";
  const dockerComposeFile = fs.readFileSync(filePath, "utf-8");

  const file = yaml.parse(dockerComposeFile) as DockerComposeFile;
  const { image } = file.services["trusted-issuers-registry-v3"];
  const imageParts = image.split(":");
  const tag = imageParts[imageParts.length - 1];

  return tag;
}

export default getDockerTag;
