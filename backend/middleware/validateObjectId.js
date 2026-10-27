/**
 * Middleware to validate MongoDB 24-character hex ObjectIDs in route parameters.
 * If the parameter is not a 24-char hex string, returns 404 immediately.
 */

const HEX_24_REGEX = /^[0-9a-fA-F]{24}$/;

export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const idVal = req.params[paramName];
    if (!idVal || !HEX_24_REGEX.test(idVal)) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    next();
  };
}

// Auto-validator checking any param matching /id$/i in req.params
export function validateAnyObjectId(req, res, next) {
  for (const [key, val] of Object.entries(req.params)) {
    if (key.toLowerCase().endsWith('id')) {
      if (!val || !HEX_24_REGEX.test(val)) {
        return res.status(404).json({ message: 'Resource not found' });
      }
    }
  }
  next();
}
