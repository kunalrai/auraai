/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as collab from "../collab.js";
import type * as commLog from "../commLog.js";
import type * as crons from "../crons.js";
import type * as doctors from "../doctors.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as patients from "../patients.js";
import type * as reminders from "../reminders.js";
import type * as settings from "../settings.js";
import type * as tokenUsage from "../tokenUsage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  billing: typeof billing;
  collab: typeof collab;
  commLog: typeof commLog;
  crons: typeof crons;
  doctors: typeof doctors;
  goals: typeof goals;
  http: typeof http;
  messages: typeof messages;
  patients: typeof patients;
  reminders: typeof reminders;
  settings: typeof settings;
  tokenUsage: typeof tokenUsage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
