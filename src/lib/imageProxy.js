/**
 * Image proxy helpers.
 *
 * Images are stored in MySQL as base64 data URIs ("data:image/png;base64,...").
 * Returning those blobs inside list APIs made responses 10-50 MB and caused
 * slow/never-finishing page loads. These helpers let list queries return a small,
 * cacheable, versioned URL instead, while keeping the same JSON field names.
 *
 *   SQL   : blobSafe('mi.image_url', 'image_url')  -> never ships the blob out of MySQL
 *   JS    : proxify(rows, req, {...})               -> "@blob:<hash>" -> absolute proxy URL
 *   Route : serveImage({...})                       -> streams the image with long-lived caching
 *   Update: resolveExistingImage(...)               -> keeps the stored blob when the admin
 *                                                      sends the proxy URL back as existingImage
 */
const crypto = require("crypto");
const pool = require("../db");

const BLOB_MARKER = "@blob:";

// SQL expression that returns a short marker for base64 images, or the raw value otherwise.
function blobSafe(colRef, alias) {
  return `CASE WHEN ${colRef} LIKE 'data:%' THEN CONCAT('${BLOB_MARKER}', LEFT(MD5(${colRef}), 12)) ELSE ${colRef} END AS \`${alias}\``;
}

/**
 * Builds a column list equivalent to `alias.*` but with the given image columns
 * wrapped in blobSafe(). Column names are read once from information_schema and
 * cached, so it adapts to schema differences between environments.
 *   await selectColumns('menu_items', 'mi', ['image_url'])
 */
const columnCache = new Map();
async function selectColumns(table, alias, imageColumns) {
  let cols = columnCache.get(table);
  if (!cols) {
    const [rows] = await pool.query(
      "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
      [table]
    );
    cols = rows.map(r => r.name);
    if (cols.length) columnCache.set(table, cols);
  }
  const prefix = alias ? `${alias}.` : "";
  if (!cols.length) return `${prefix}*`; // fallback: behave exactly as before
  return cols
    .map(c => (imageColumns.includes(c) ? blobSafe(`${prefix}\`${c}\``, c) : `${prefix}\`${c}\``))
    .join(", ");
}

function publicBase(req) {
  const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
  let proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();
  // Public domains are always served over HTTPS (avoids mixed-content blocking).
  if (/(^|\.)bhagona\.in$/i.test(host.split(":")[0])) proto = "https";
  return `${proto}://${host}`;
}

function asString(value) {
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return value;
}

/**
 * Converts a column value to a display URL.
 *  - "@blob:<hash>" (from blobSafe)  -> absolute versioned proxy URL
 *  - "data:..." (blob fetched anyway) -> absolute versioned proxy URL
 *  - anything else                    -> returned unchanged
 */
function toImageUrl(value, req, route, id) {
  value = asString(value);
  if (typeof value === "string") {
    value = value.trim();
    // Junk left in the DB by older forms ("", "undefined", "null") -> no image
    if (value === "" || value === "undefined" || value === "null" || value === "NaN") return null;
  }
  if (!value || typeof value !== "string" || id === undefined || id === null) return value;
  let version;
  if (value.startsWith(BLOB_MARKER)) {
    version = value.slice(BLOB_MARKER.length);
  } else if (value.startsWith("data:")) {
    version = crypto.createHash("md5").update(value).digest("hex").slice(0, 12);
  } else {
    return value;
  }
  return `${publicBase(req)}${route}/image/${id}?v=${version}`;
}

/**
 * Rewrites image fields on rows in place and sets display_url to the same URL.
 * opts: { field, idField, route, displayField = 'display_url' | null }
 */
function proxify(rows, req, { field, idField, route, displayField = "display_url" }) {
  const list = Array.isArray(rows) ? rows : [rows];
  for (const row of list) {
    if (!row || !(field in row)) continue;
    const url = toImageUrl(row[field], req, route, row[idField]);
    row[field] = url === undefined ? null : url;
    if (displayField) row[displayField] = row[field] || null;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Image serving with caching
// ---------------------------------------------------------------------------
const CACHE_MAX_BYTES = 64 * 1024 * 1024; // per process
const cache = new Map(); // key -> { type, buf }
let cacheBytes = 0;

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit); // LRU bump
  }
  return hit;
}

function cacheSet(key, entry) {
  if (entry.buf.length > CACHE_MAX_BYTES / 4) return;
  const old = cache.get(key);
  if (old) {
    cacheBytes -= old.buf.length;
    cache.delete(key);
  }
  cache.set(key, entry);
  cacheBytes += entry.buf.length;
  while (cacheBytes > CACHE_MAX_BYTES && cache.size) {
    const [k, v] = cache.entries().next().value;
    cache.delete(k);
    cacheBytes -= v.buf.length;
  }
}

function sendImage(req, res, entry) {
  res.set("Content-Type", entry.type);
  if (req.query.v) {
    // Versioned URL: content for this URL never changes.
    res.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.set("Cache-Control", "public, max-age=300");
  }
  res.send(entry.buf);
}

/**
 * Express handler for GET /image/:id.
 * opts: { table, column, idColumn, label }
 * Response semantics match the previous handlers (404 / 400 / 500 bodies).
 */
function serveImage({ table, column, idColumn, label = "Image" }) {
  return async (req, res) => {
    try {
      const { id } = req.params;
      if (!/^[0-9]+$/.test(String(id))) return res.status(404).send("Image not found");
      const version = typeof req.query.v === "string" ? req.query.v : "";
      const key = `${table}:${id}:${version}`;

      if (version) {
        const hit = cacheGet(key);
        if (hit) return sendImage(req, res, hit);
      }

      const [rows] = await pool.query(
        `SELECT \`${column}\` AS img FROM \`${table}\` WHERE \`${idColumn}\` = ?`,
        [id]
      );
      const data = rows.length ? asString(rows[0].img) : null;

      if (!data || typeof data !== "string" || !data.startsWith("data:")) {
        return res.status(404).send("Image not found");
      }

      const commaIdx = data.indexOf(",");
      const header = commaIdx > 0 ? data.slice(5, commaIdx) : "";
      const semi = header.indexOf(";base64");
      if (commaIdx < 0 || semi < 0 || !/^[A-Za-z-+\/.]+$/.test(header.slice(0, semi))) {
        return res.status(400).send("Invalid image data");
      }

      const entry = {
        type: header.slice(0, semi),
        buf: Buffer.from(data.slice(commaIdx + 1), "base64"),
      };
      if (version) cacheSet(key, entry);
      return sendImage(req, res, entry);
    } catch (err) {
      console.error(`❌ ${label} serve error:`, err);
      res.status(500).send("Error serving image");
    }
  };
}

// ---------------------------------------------------------------------------
// Update helpers
// ---------------------------------------------------------------------------
const PROXY_URL_RE = /\/image\/\d+(\?v=[0-9a-f]+)?$/i;

function isProxyImageUrl(value) {
  return typeof value === "string" && !value.startsWith("data:") && PROXY_URL_RE.test(value);
}

/**
 * Admin forms send the current image back as `existingImage`. Since list APIs now
 * return a proxy URL, map that URL back to the stored value so updates without a
 * new upload keep the original image untouched.
 */
async function resolveExistingImage(existingImage, { table, column, idColumn, id }) {
  if (typeof existingImage === "string" && ["", "undefined", "null", "NaN"].includes(existingImage.trim())) return null;
  if (!isProxyImageUrl(existingImage)) return existingImage;
  const [rows] = await pool.query(
    `SELECT \`${column}\` AS img FROM \`${table}\` WHERE \`${idColumn}\` = ?`,
    [id]
  );
  return rows.length ? rows[0].img : null;
}

module.exports = {
  blobSafe,
  selectColumns,
  proxify,
  toImageUrl,
  serveImage,
  resolveExistingImage,
  isProxyImageUrl,
};
