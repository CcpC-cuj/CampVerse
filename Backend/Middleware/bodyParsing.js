/**
 * Middleware to automatically parse JSON strings in multipart/form-data request bodies.
 * Multer often sends nested objects as JSON strings.
 */
function parseJsonBody(fields = []) {
  return (req, res, next) => {
    if (!req.body) return next();

    fields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          // Check if it looks like a JSON string
          const firstChar = req.body[field].trim()[0];
          if (firstChar === '{' || firstChar === '[') {
            req.body[field] = JSON.parse(req.body[field]);
          }
        } catch (e) {
          // If parsing fails, leave as is and let the controller handle or reject
          console.warn(`[Parsing Middleware] Failed to parse field "${field}":`, e.message);
        }
      }
    });

    next();
  };
}

module.exports = { parseJsonBody };
