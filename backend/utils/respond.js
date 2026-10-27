/**
 * Standard server error response helper.
 * Logs the genuine stack trace on the server for debugging,
 * but safely returns a sanitized generic error message to the client.
 */
export function serverError(res, err, message = 'Internal server error') {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({ message });
}
