import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-ink leading-relaxed">
      <div className="border-b border-line pb-6 mb-8">
        <h1 className="font-serif text-3xl font-bold mb-2">Campus Privacy & Safety Policy</h1>
        <p className="text-xs sm:text-sm text-muted">
          A plain-language explanation of how Found. protects your contact details, privacy, and campus safety.
        </p>
      </div>

      <div className="space-y-8 text-sm">
        <section className="bg-white border border-line rounded-md p-6 shadow-notice space-y-3">
          <h2 className="font-serif text-lg font-bold text-moss">1. What Information is Public</h2>
          <p className="text-ink/80">
            When you publish a notice on Found., anyone visiting the board (students and visitors) can see:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink/80">
            <li>Item title and category</li>
            <li>Item description and location</li>
            <li>Uploaded item photograph</li>
            <li>
              <strong>Poster's First Name Only:</strong> e.g., "Arjun" or "Priya".
            </li>
          </ul>
          <p className="text-xs text-muted pt-2 border-t border-line/60">
            We never display your phone number, email address, student ID, or full surname on public board cards or search listings.
          </p>
        </section>

        <section className="bg-white border border-line rounded-md p-6 shadow-notice space-y-3">
          <h2 className="font-serif text-lg font-bold text-moss">2. When Contact Details Are Shared</h2>
          <p className="text-ink/80">
            To prevent spam calls, data harvesting, and unauthorized messaging, your phone number and college email are locked behind inquiry responses:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-ink/80">
            <li>
              A student must be logged in with a verified campus account.
            </li>
            <li>
              The student must submit an inquiry message describing how they can return or trade the item.
            </li>
            <li>
              Only upon submitting this message are your contact details revealed directly to that student so you can coordinate a safe meetup.
            </li>
          </ul>
        </section>

        <section className="bg-white border border-line rounded-md p-6 shadow-notice space-y-3">
          <h2 className="font-serif text-lg font-bold text-moss">3. Private Verification Hints</h2>
          <p className="text-ink/80">
            When reporting lost or found items, you can record a <em>Private Verification Hint</em> (e.g. "Has initials scratched on back", "Wallpaper photo", "Serial number ending in 44").
          </p>
          <p className="text-ink/80">
            This field is encrypted in transit, excluded from all public API endpoints, and visible <strong>only to you</strong> when logged in. When a responder contacts you, ask them to identify this secret feature before handing over the item.
          </p>
        </section>

        <section className="bg-white border border-line rounded-md p-6 shadow-notice space-y-3">
          <h2 className="font-serif text-lg font-bold text-moss">4. Data Expiration and Permanent Deletion</h2>
          <p className="text-ink/80">
            • <strong>Auto-Archiving:</strong> Active notices automatically expire 30 days after creation.
          </p>
          <p className="text-ink/80">
            • <strong>Account Purge:</strong> You may delete your account at any time from your settings page. Doing so permanently cascades and purges all your posts, submitted responses, and reports from the database.
          </p>
        </section>

        <section className="bg-white border border-line rounded-md p-6 shadow-notice space-y-3">
          <h2 className="font-serif text-lg font-bold text-moss">5. Campus Meetup Safety Tips</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-ink/80">
            <li>Meet in high-visibility campus locations: the central library lobby, student union dining hall, or campus security desk.</li>
            <li>Inspect the item and confirm ownership before exchanging contact or trade goods.</li>
            <li>If anyone asks for advance money or acts suspiciously, report the notice immediately.</li>
          </ul>
        </section>

        <div className="pt-4 text-center">
          <Link
            to="/"
            className="inline-block bg-moss hover:bg-moss-dark text-paper text-xs font-semibold px-6 py-2.5 rounded transition-colors shadow-sm"
          >
            ← Back to Campus Board
          </Link>
        </div>
      </div>
    </div>
  );
}
