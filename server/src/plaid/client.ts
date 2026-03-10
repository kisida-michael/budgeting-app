import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { env } from "../env.js";

const configured = Boolean(env.PLAID_CLIENT_ID && env.PLAID_SECRET);

const parsedProducts = env.PLAID_PRODUCTS.filter((value): value is Products =>
  Object.values(Products).includes(value as Products)
);
const parsedCountryCodes = env.PLAID_COUNTRY_CODES.filter((value): value is CountryCode =>
  Object.values(CountryCode).includes(value as CountryCode)
);

const plaidConfiguration = configured
  ? new Configuration({
      basePath: PlaidEnvironments[env.PLAID_ENV],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID!,
          "PLAID-SECRET": env.PLAID_SECRET!
        }
      }
    })
  : null;

const plaidClient = plaidConfiguration ? new PlaidApi(plaidConfiguration) : null;

export const plaidProducts = parsedProducts.length > 0 ? parsedProducts : [Products.Transactions];
export const plaidCountryCodes = parsedCountryCodes.length > 0 ? parsedCountryCodes : [CountryCode.Us];

export function isPlaidConfigured() {
  return configured;
}

export function getPlaidUnavailableReason() {
  return configured ? null : "Set PLAID_CLIENT_ID and PLAID_SECRET to enable bank connections.";
}

export function getPlaidClient() {
  if (!plaidClient) {
    throw new Error(getPlaidUnavailableReason() ?? "Plaid is not configured.");
  }

  return plaidClient;
}
