/**
 * Background auto-archive job for expired posts.
 * Runs on server boot and every 6 hours thereafter.
 */

// Sweeps the database for active posts whose expiration date has passed
export async function runArchiveJob(PostModel) {
  try {
    const now = new Date();
    const result = await PostModel.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: now }
      },
      {
        $set: { status: 'archived' }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[ArchiveJob] Archived ${result.modifiedCount} expired posts at ${now.toISOString()}`);
    }
    return result.modifiedCount;
  } catch (error) {
    console.error('[ArchiveJob] Error running auto-archive job:', error);
    return 0;
  }
}

// Starts the interval schedule (runs every 6 hours)
export function startArchiveCron(PostModel) {
  // Execute immediately on boot
  runArchiveJob(PostModel);

  // 6 hours in milliseconds
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const interval = setInterval(() => {
    runArchiveJob(PostModel);
  }, SIX_HOURS_MS);

  // Unref interval so it doesn't prevent Node process from gracefully shutting down
  if (interval.unref) {
    interval.unref();
  }

  return interval;
}
