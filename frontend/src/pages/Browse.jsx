import React, { useState, useEffect, useCallback } from 'react';
import api from '../api.js';
import PostCard from '../components/PostCard.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';

const TYPE_TABS = [
  { id: '', label: 'All Notices' },
  { id: 'lost', label: '🔍 Lost Items' },
  { id: 'found', label: '📦 Found Items' },
  { id: 'trade', label: '🔄 Trade Board' },
];

const CATEGORIES = [
  'All',
  'Electronics',
  'Accessories',
  'Books',
  'Clothing',
  'IDs & Cards',
  'Keys',
  'Other',
];

export default function Browse() {
  const [posts, setPosts] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch posts from API with active filters
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 12,
      };
      if (selectedType) params.type = selectedType;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/posts', { params });

      // Defensive check: ensure posts is an array to survive malformed server payloads
      if (res.data && Array.isArray(res.data.posts)) {
        setPosts(res.data.posts);
        setTotalPages(res.data.totalPages || 1);
        setTotalPosts(res.data.total || 0);
      } else {
        setPosts([]);
        setTotalPages(1);
        setTotalPosts(0);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Unable to load campus notices right now.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedCategory, searchQuery, currentPage]);

  // Fetch public stats & top finders
  useEffect(() => {
    async function fetchStatsAndLeaderboard() {
      try {
        const [statsRes, lbRes] = await Promise.allSettled([
          api.get('/leaderboard/stats'),
          api.get('/leaderboard'),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.data) {
          setResolvedCount(statsRes.value.data.resolvedCount || 0);
        }

        if (lbRes.status === 'fulfilled' && lbRes.value.data && Array.isArray(lbRes.value.data.leaders)) {
          setLeaders(lbRes.value.data.leaders);
        }
      } catch (err) {
        console.error('Error fetching leaderboard/stats:', err);
      }
    }

    fetchStatsAndLeaderboard();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPosts();
  };

  const handleTypeChange = (typeId) => {
    setSelectedType(typeId);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Banner */}
      <div className="mb-8 border-b border-line pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-2">
              Campus Noticeboard
            </h1>
            <p className="text-muted text-sm sm:text-base max-w-xl">
              Report lost gear, return found belongings safely, and trade books with fellow students.
            </p>
          </div>

          {/* Reunited counter badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-line px-4 py-2 rounded-md shadow-notice">
            <span className="text-xl">🤝</span>
            <div>
              <div className="text-xs text-muted font-medium uppercase tracking-wider">Campus Impact</div>
              <div className="text-sm font-bold text-moss font-serif">
                {resolvedCount} {resolvedCount === 1 ? 'item' : 'items'} reunited
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Board Content (3 Columns) */}
        <div className="lg:col-span-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search lost umbrellas, calculators, keys, books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-white border border-line rounded px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-moss shadow-sm"
              />
              <button
                type="submit"
                className="bg-moss hover:bg-moss-dark text-paper text-sm font-medium px-5 py-2.5 rounded transition-colors shadow-sm"
              >
                Search
              </button>
            </div>
          </form>

          {/* Type Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTypeChange(tab.id)}
                className={`text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-ink text-paper border-ink shadow-sm'
                    : 'bg-white text-ink/70 border-line hover:border-ink/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none text-xs">
            <span className="text-muted font-medium mr-1">Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-moss/10 text-moss font-semibold border border-moss/30'
                    : 'bg-white text-muted hover:text-ink border border-line'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Error State with Friendly Try Again */}
          {error && (
            <div className="bg-white border border-red-200 rounded p-6 text-center my-6 shadow-notice">
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <button
                onClick={fetchPosts}
                className="bg-paper hover:bg-stone-200 text-ink text-xs font-semibold px-4 py-2 rounded border border-line"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading Skeleton Grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          )}

          {/* Empty Notices State */}
          {!loading && !error && Array.isArray(posts) && posts.length === 0 && (
            <div className="bg-white border border-line rounded-md p-10 text-center shadow-notice">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-serif text-lg font-bold text-ink mb-1">No notices found</h3>
              <p className="text-muted text-sm max-w-sm mx-auto mb-4">
                There are no active notices matching your current search or category filter.
              </p>
              {(searchQuery || selectedType || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setSelectedType('');
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="text-xs text-moss font-semibold underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Post Grid */}
          {!loading && !error && Array.isArray(posts) && posts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
              <div>
                Showing page <span className="font-semibold text-ink">{currentPage}</span> of{' '}
                <span className="font-semibold text-ink">{totalPages}</span> ({totalPosts} notices)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-line rounded text-ink text-xs font-medium hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-line rounded text-ink text-xs font-medium hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Leaderboard & Community Rules (1 Column) */}
        <aside className="space-y-6">
          {/* Good Samaritan Leaderboard */}
          <div className="bg-white border border-line rounded-md p-5 shadow-notice">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🏆</span>
              <h2 className="font-serif text-lg font-bold text-ink">Finder Honor Roll</h2>
            </div>
            <p className="text-xs text-muted mb-4">
              Students awarded +10 points for safely returning lost items to their owners.
            </p>

            {leaders.length === 0 ? (
              <p className="text-xs text-muted italic">No points recorded yet. Be the first to return an item!</p>
            ) : (
              <ol className="divide-y divide-line/60 text-sm">
                {leaders.map((student, idx) => (
                  <li key={idx} className="py-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink/90 font-medium truncate max-w-[70%]">
                      <span className="text-xs font-mono text-muted w-4">#{idx + 1}</span>
                      <span className="truncate">{student.name}</span>
                    </span>
                    <span className="text-xs font-bold text-moss bg-moss/10 px-2 py-0.5 rounded-full">
                      {student.points} pts
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Campus Safety & Privacy Guidelines */}
          <div className="bg-white border border-line rounded-md p-5 shadow-notice text-xs text-muted space-y-2">
            <h3 className="font-serif text-sm font-bold text-ink">Campus Guidelines</h3>
            <p>
              • <strong>Private Verification:</strong> Ask responders for distinguishing details before handing over items.
            </p>
            <p>
              • <strong>Safe Meetings:</strong> Always meet at high-traffic campus spots: library desks or student centers.
            </p>
            <p>
              • <strong>Privacy Guarantee:</strong> Your phone and email are never shown on public listings.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
