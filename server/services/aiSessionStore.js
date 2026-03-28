/**
 * AI Session Store
 * Manages per-user conversation history in memory.
 * In production, replace with Redis for multi-instance support.
 */

const sessions = new Map();

const MAX_HISTORY   = 20;   // max messages kept per session
const SESSION_TTL   = 60 * 60 * 1000; // 1 hour

// ── Session structure ──────────────────────────────────────────────────────
const createSession = (userId) => ({
  userId,
  history:     [],        // OpenAI message format [{role, content}]
  context:     {},        // accumulated context (cart intent, last product, etc.)
  pendingSteps:[],        // queued step-by-step messages not yet sent
  createdAt:   Date.now(),
  updatedAt:   Date.now(),
});

// ── Get or create session ──────────────────────────────────────────────────
const getSession = (userId) => {
  const key = String(userId);
  if (!sessions.has(key)) {
    sessions.set(key, createSession(key));
  }
  const session = sessions.get(key);
  session.updatedAt = Date.now();
  return session;
};

// ── Add message to history ────────────────────────────────────────────────
const addMessage = (userId, role, content) => {
  const session = getSession(userId);
  session.history.push({ role, content: String(content) });
  // Keep history trimmed (keep system message + last N)
  if (session.history.length > MAX_HISTORY + 1) {
    const systemMsg = session.history.find(m => m.role === 'system');
    const rest      = session.history.filter(m => m.role !== 'system').slice(-MAX_HISTORY);
    session.history = systemMsg ? [systemMsg, ...rest] : rest;
  }
  session.updatedAt = Date.now();
};

// ── Update context ────────────────────────────────────────────────────────
const updateContext = (userId, updates) => {
  const session = getSession(userId);
  session.context = { ...session.context, ...updates };
  session.updatedAt = Date.now();
};

// ── Queue step messages ───────────────────────────────────────────────────
const setPendingSteps = (userId, steps) => {
  const session = getSession(userId);
  session.pendingSteps = steps;
  session.updatedAt = Date.now();
};

const popNextStep = (userId) => {
  const session = getSession(userId);
  if (session.pendingSteps.length === 0) return null;
  return session.pendingSteps.shift();
};

const hasPendingSteps = (userId) => {
  const session = getSession(userId);
  return session.pendingSteps.length > 0;
};

// ── Clear session ─────────────────────────────────────────────────────────
const clearSession = (userId) => {
  sessions.delete(String(userId));
};

// ── Cleanup expired sessions ──────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL) {
      sessions.delete(key);
    }
  }
}, 15 * 60 * 1000); // every 15 minutes

module.exports = {
  getSession,
  addMessage,
  updateContext,
  setPendingSteps,
  popNextStep,
  hasPendingSteps,
  clearSession,
};
