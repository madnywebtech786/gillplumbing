// All money is stored and calculated as integer minor units (cents).
// Never use floating-point arithmetic for financial values (spec 6.8).

export function addMinor(...amountsMinor) {
  return amountsMinor.reduce((sum, amount) => sum + amount, 0);
}

export function subtractMinor(a, b) {
  return a - b;
}

export function sumSignedLedgerDeltas(transactions) {
  return transactions.reduce((sum, tx) => sum + tx.signedAmountMinor, 0);
}

// Converts a user-entered decimal string/number (e.g. "125.50") into
// integer minor units (12550). Throws on invalid or overly precise input.
export function parseDecimalToMinor(value) {
  if (value === null || value === undefined || value === "") {
    throw new Error("Amount is required");
  }

  const stringValue = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(stringValue)) {
    throw new Error("Amount must be a valid number with at most 2 decimal places");
  }

  const [wholePart, fractionalPart = ""] = stringValue.split(".");
  const paddedFraction = fractionalPart.padEnd(2, "0");
  const minor = Number(wholePart) * 100 + Number(paddedFraction);

  if (!Number.isFinite(minor) || minor < 0) {
    throw new Error("Amount must be zero or greater");
  }

  return minor;
}

export function formatMinor(amountMinor, currencyCode) {
  const amount = amountMinor / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}
