/**
 * Route not found handler for unmatched API paths.
 */
export function notFoundHandler(req, res) {
  return res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Global application error handler:
 * - Catches JSON parse errors (SyntaxError) and converts to clean 400 response
 * - Never returns stack traces to the client
 * - Logs internal exceptions to the server console
 */
export function globalErrorHandler(err, req, res, next) {
  // Catch bad JSON in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Malformed JSON body.' });
  }

  // Handle mongoose CastError (e.g. invalid object id in query or body)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for field: ${err.path}` });
  }

  // Log error securely on server
  console.error('Unhandled Application Exception:', err);

  const statusCode = err.status || err.statusCode || 500;
  // Only reveal message for client errors (4xx), hide 5xx internal details
  const message = statusCode < 500 ? (err.message || 'Client error') : 'Internal server error';

  return res.status(statusCode).json({ message });
}
