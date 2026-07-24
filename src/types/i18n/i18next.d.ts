import "i18next";

import Resources from "./resources";

/**
 * This file augments (extends) the i18next module to add TypeScript support.
 *
 * We get a full autocomplete and type-safety when we use the `t()`
 *
 * If we are going to access a translation key that doesn't exist typescript will error.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "home" | "food";
    resources: Resources;
  }
}
