/**
 * Recursive util for types that flattens nested JSON objects
 * into a union of dot-notation string keys.
 *
 * This is helpful when we try to map a declared type constant to avoid the ts errors.
 *
 * Example:
 *
 * Input type:
 * {
 *   "navbar": {
 *     "home": "Home",
 *     "about": "About"
 *   },
 *   "buttons": {
 *     "submit": "Submit",
 *     "cancel": "Cancel"
 *   }
 * }
 *
 * Resulting type (NestedKeys<typeof input>):
 * | "navbar.home"
 * | "navbar.about"
 * | "buttons.submit"
 * | "buttons.cancel"
 *
 * This is useful for translation keys in i18n,
 * so you can have autocomplete and type safety when calling `t("...")`.
 */

export type NestedKeys<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? NestedKeys<T[K], `${Prefix}${K & string}.`>
    : `${Prefix}${K & string}`;
}[keyof T];
