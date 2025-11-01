/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_cryptoActions from "../actions/cryptoActions.js";
import type * as admin from "../admin.js";
import type * as http from "../http.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_widget from "../lib/widget.js";
import type * as oauth from "../oauth.js";
import type * as templates_errorPage from "../templates/errorPage.js";
import type * as templates_spinningPage from "../templates/spinningPage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/cryptoActions": typeof actions_cryptoActions;
  admin: typeof admin;
  http: typeof http;
  "lib/constants": typeof lib_constants;
  "lib/helpers": typeof lib_helpers;
  "lib/validation": typeof lib_validation;
  "lib/widget": typeof lib_widget;
  oauth: typeof oauth;
  "templates/errorPage": typeof templates_errorPage;
  "templates/spinningPage": typeof templates_spinningPage;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
