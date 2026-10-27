import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import Browse from '../src/pages/Browse.jsx';
import PostDetail from '../src/pages/PostDetail.jsx';
import Signup from '../src/pages/Signup.jsx';
import Login from '../src/pages/Login.jsx';
import VerifyEmail from '../src/pages/VerifyEmail.jsx';
import MyPosts from '../src/pages/MyPosts.jsx';
import Admin from '../src/pages/Admin.jsx';
import Profile from '../src/pages/Profile.jsx';
import NotFound from '../src/pages/NotFound.jsx';
import Navbar from '../src/components/Navbar.jsx';
import { ErrorBoundary } from '../src/components/ErrorBoundary.jsx';
import { ToastProvider } from '../src/components/Toast.jsx';

// Mock the API module
vi.mock('../src/api.js', () => {
  const getStoredToken = vi.fn(() => null);
  const getStoredUser = vi.fn(() => null);
  const saveSession = vi.fn();
  const clearSession = vi.fn();
  const triggerUserRefresh = vi.fn();

  const api = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    default: api,
    getStoredToken,
    getStoredUser,
    saveSession,
    clearSession,
    triggerUserRefresh,
  };
});

import api, { getStoredToken, getStoredUser } from '../src/api.js';

function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <ErrorBoundary>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

describe('Found. Frontend Component and Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // 1. Browse Page
  it('renders Browse page with notices, filters, and stats', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/posts') {
        return Promise.resolve({
          data: {
            posts: [
              {
                _id: 'post123',
                title: 'Blue Water Bottle',
                description: 'Found in library',
                category: 'Accessories',
                type: 'lost',
                status: 'active',
                location: 'Library 2nd Floor',
                createdAt: new Date().toISOString(),
                user: { name: 'Arjun Kumar' },
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        });
      }
      if (url === '/leaderboard/stats') {
        return Promise.resolve({ data: { resolvedCount: 14 } });
      }
      if (url === '/leaderboard') {
        return Promise.resolve({
          data: { leaders: [{ name: 'Priya Sharma', points: 30 }] },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<Browse />);

    expect(screen.getByText(/Campus Noticeboard/i)).toBeInTheDocument();
    expect(await screen.findByText('Blue Water Bottle')).toBeInTheDocument();
    expect(screen.getByText(/14 items reunited/i)).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
  });

  // 2. PostDetail as Visitor
  it('renders PostDetail as visitor without verification hint and with response form', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        post: {
          _id: 'post123',
          title: 'Lost Scientific Calculator',
          description: 'Left in Lab 3',
          category: 'Electronics',
          type: 'lost',
          status: 'active',
          location: 'Lab 3',
          createdAt: new Date().toISOString(),
          user: { name: 'Arjun Kumar' },
          // Note: verificationHint omitted by server for visitor
        },
        isOwner: false,
        match: null,
      },
    });

    renderWithProviders(
      <Routes>
        <Route path="/post/:id" element={<PostDetail />} />
      </Routes>,
      { route: '/post/post123' }
    );

    expect(await screen.findByText('Lost Scientific Calculator')).toBeInTheDocument();
    expect(screen.queryByText(/Private Verification Hint/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Respond to this Notice/i)).toBeInTheDocument();
  });

  // 3. PostDetail as Owner
  it('renders PostDetail as owner displaying private hint and owner controls', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        post: {
          _id: 'post123',
          title: 'Lost Scientific Calculator',
          description: 'Left in Lab 3',
          category: 'Electronics',
          type: 'lost',
          status: 'active',
          location: 'Lab 3',
          verificationHint: 'Has my initials AK engraved inside cover',
          createdAt: new Date().toISOString(),
          user: { _id: 'user1', name: 'Arjun Kumar' },
        },
        isOwner: true,
        match: null,
      },
    });

    renderWithProviders(
      <Routes>
        <Route path="/post/:id" element={<PostDetail />} />
      </Routes>,
      { route: '/post/post123' }
    );

    expect(await screen.findByText(/Private Verification Hint \(Visible only to you\)/i)).toBeInTheDocument();
    expect(screen.getByText('Has my initials AK engraved inside cover')).toBeInTheDocument();
    expect(screen.getByText('Edit Notice')).toBeInTheDocument();
    expect(screen.getByText('Delete Notice')).toBeInTheDocument();
  });

  // 4. Signup Page
  it('submits signup form and redirects to verification page', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        needsVerification: true,
        email: 'test@college.edu',
        message: 'Verification code sent',
      },
    });

    renderWithProviders(<Signup />);

    fireEvent.change(screen.getByPlaceholderText(/Arjun Kumar/i), {
      target: { value: 'Test Student' },
    });
    fireEvent.change(screen.getByPlaceholderText(/yourname@gmail.com/i), {
      target: { value: 'test@college.edu' },
    });
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'password123' },
    });

    // Check agreement
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/auth/signup',
        expect.objectContaining({
          name: 'Test Student',
          email: 'test@college.edu',
          phone: '9876543210',
          agreed: true,
        })
      );
    });
  });

  // 5. Login Page & Authentication
  it('handles login form submission', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        message: 'Logged in successfully.',
        user: { id: 'u1', name: 'Arjun', email: 'arjun@example.com' },
        token: 'fake-jwt-token',
      },
    });

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/yourname@gmail.com/i), {
      target: { value: 'arjun@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        identifier: 'arjun@example.com',
        password: 'password123',
      });
    });
  });

  // 6. VerifyEmail Page
  it('submits 6-digit verification code', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        message: 'Email verified',
        user: { id: 'u1', name: 'Arjun', emailVerified: true },
        token: 'fake-jwt-token',
      },
    });

    renderWithProviders(<VerifyEmail />, { route: '/verify-email?email=test@college.edu' });

    const codeInput = screen.getByPlaceholderText('123456');
    fireEvent.change(codeInput, { target: { value: '654321' } });

    fireEvent.click(screen.getByRole('button', { name: /Verify and Log In/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/verify-email', {
        email: 'test@college.edu',
        code: '654321',
      });
    });
  });

  // 7. MyPosts Page
  it('renders user notices and triggers resolution', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        posts: [
          {
            _id: 'mypost1',
            title: 'My Found Earbuds',
            description: 'Black case',
            category: 'Electronics',
            type: 'found',
            status: 'active',
            location: 'Gym',
            expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
          },
        ],
      },
    });
    api.patch.mockResolvedValueOnce({
      data: { message: 'Post marked as resolved' },
    });

    renderWithProviders(<MyPosts />);

    expect(await screen.findByText('My Found Earbuds')).toBeInTheDocument();
    const resolveBtn = screen.getByText('Mark Resolved');
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/posts/mypost1/resolve');
    });
  });

  // 8. Admin Page
  it('renders admin reports and all notices', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/admin/reports') {
        return Promise.resolve({
          data: {
            reports: [
              {
                _id: 'rep1',
                reason: 'spam',
                note: 'Duplicate spam post',
                post: { _id: 'postX', title: 'Suspicious Free Phone' },
                reporter: { name: 'Student Reporter', email: 'rep@college.edu' },
              },
            ],
          },
        });
      }
      if (url === '/admin/posts') {
        return Promise.resolve({
          data: {
            posts: [
              {
                _id: 'postX',
                title: 'Suspicious Free Phone',
                type: 'found',
                status: 'active',
                location: 'Hostel',
                user: { name: 'Spammer' },
              },
            ],
          },
        });
      }
      if (url === '/admin/users') {
        return Promise.resolve({
          data: {
            users: [
              { _id: 'u1', name: 'Admin User', email: 'admin@college.edu', role: 'admin', points: 0, emailVerified: true },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<Admin />);

    expect(await screen.findByText(/Campus Moderation Panel/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Suspicious Free Phone/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Duplicate spam post')).toBeInTheDocument();
  });

  // 9. Profile Page
  it('renders profile and updates personal details', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        user: {
          name: 'Arjun Kumar',
          email: 'arjun@college.edu',
          phone: '9876543210',
          role: 'student',
        },
      },
    });
    api.patch.mockResolvedValueOnce({
      data: {
        user: { name: 'Arjun Updated', phone: '9876543210' },
      },
    });

    renderWithProviders(<Profile />);

    expect(await screen.findByDisplayValue('Arjun Kumar')).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('Arjun Kumar');
    fireEvent.change(nameInput, { target: { value: 'Arjun Updated' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/auth/profile',
        expect.objectContaining({ name: 'Arjun Updated' })
      );
    });
  });

  // 10. NotFound (404)
  it('renders NotFound component for unmatched routes', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText(/404: Notice Unpinned/i)).toBeInTheDocument();
  });

  // 11. Navbar Logged-In State
  it('renders logged-in controls and points badge in Navbar', async () => {
    getStoredToken.mockReturnValue('valid-token');
    getStoredUser.mockReturnValue({
      name: 'Priya Sharma',
      points: 25,
      role: 'student',
    });

    renderWithProviders(<Navbar />);

    expect(screen.getByText(/25 pts/i)).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  // 12. ErrorBoundary
  it('catches render exceptions and renders friendly fallback', () => {
    const ProblemChild = () => {
      throw new Error('Test Explosion');
    };

    // Suppress console.error during expected throw
    const originalError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();

    console.error = originalError;
  });

  // 13. Board Surviving Odd Server Answers
  it('board survives unexpected/malformed server response without crashing', async () => {
    // Return an unexpected non-array payload
    api.get.mockImplementation((url) => {
      if (url === '/posts') {
        return Promise.resolve({
          data: { posts: 'invalid_string_instead_of_array' },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<Browse />);

    // Board should not crash; it safely defaults to empty list
    expect(await screen.findByText(/No notices found/i)).toBeInTheDocument();
  });
});
