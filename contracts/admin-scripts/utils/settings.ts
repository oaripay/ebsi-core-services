import * as fs from "node:fs";

type Options = {
  basePath?: string;
};

// eslint-disable-next-line import/prefer-default-export
export class Settings {
  #basePath: string;

  #network: string;

  #tag: string | undefined;

  #fileName: string = "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #data: Record<string, any>;

  #didRead: boolean = false;

  constructor(
    fileName: string,
    tag: string | undefined = undefined,
    options: Options = {
      basePath: "./settings",
    },
  ) {
    this.#basePath = options.basePath || "./settings";

    // eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
    const hre = require("hardhat");
    this.#network = hre.network.name;

    this.#tag = tag;
    this.#fileName = fileName;
    this.#data = {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string, defaultValue: any = undefined) {
    if (!this.#didRead) {
      this.#readJSON();
    }

    const value = this.#data[key];
    if (!value) {
      return defaultValue;
    }

    return value;
  }

  mustGet(key: string) {
    const value = this.get(key);

    if (!value) {
      throw new Error(`Value for ${key} not found`);
    }

    return value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(key: string, value: any) {
    if (!this.#didRead) {
      this.#readJSON();
    }

    this.#data[key] = value;

    this.#writeJSON();
  }

  #getPath() {
    return `${this.#getDirectoryPath()}/${this.#fileName}.json`;
  }

  #getDirectoryPath() {
    if (this.#tag === undefined) {
      return `./${this.#basePath}/${this.#network}`;
    }

    return `./${this.#basePath}/${this.#network}/${this.#tag}`;
  }

  #readJSON() {
    const path = this.#getPath();

    if (!fs.existsSync(path)) {
      this.#didRead = true;
      this.#data = {};

      return;
    }

    this.#data = JSON.parse(fs.readFileSync(path, "utf8"));
    this.#didRead = true;
  }

  #writeJSON() {
    if (!this.#didRead) {
      return;
    }

    this.#ensureDirectoryExistence();

    const data = JSON.stringify(this.#data, null, 4);

    fs.writeFileSync(this.#getPath(), data, {
      flag: "w",
    });
  }

  #ensureDirectoryExistence() {
    const path = this.#getDirectoryPath();

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }
}
