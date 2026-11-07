/**
 * Request sanitising.
 *
 * Browsers turn missing values into literal strings when building FormData
 * (formData.append('x', undefined) sends "undefined"), and some clients build
 * URLs like `?vendor_id=undefined`. Those strings used to pass `if (!value)`
 * checks and were saved to the database as real data.
 *
 * This middleware normalises such placeholder values to an empty string so the
 * existing `!value` / `value || null` checks in every route behave correctly.
 */
// Exact, case-sensitive spellings JavaScript produces (String(undefined), String(null), String(NaN)),
// so real values like a person named "Nan" or "Null" are never touched.
const PLACEHOLDERS = new Set(["undefined", "null", "NaN"]);

function isPlaceholder(value) {
  return typeof value === "string" && PLACEHOLDERS.has(value.trim());
}

/** True when a value is missing, blank, or a placeholder string. */
function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "" || isPlaceholder(value);
  return false;
}

function cleanValue(value) {
  if (isPlaceholder(value)) return "";
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    for (const key of Object.keys(value)) value[key] = cleanValue(value[key]);
  }
  return value;
}

/** Express middleware: sanitises req.body and req.query in place. */
function cleanRequest(req, _res, next) {
  try {
    if (req.body && typeof req.body === "object") cleanValue(req.body);
    if (req.query && typeof req.query === "object") {
      for (const key of Object.keys(req.query)) {
        const v = req.query[key];
        if (typeof v === "string" && isBlank(v)) delete req.query[key];
      }
    }
  } catch (e) {
    // never block a request because of sanitising
  }
  next();
}

module.exports = { cleanRequest, cleanValue, isBlank, isPlaceholder };
