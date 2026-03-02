# Email Agent — Implementation Plan

## Overview
Build an AI-powered email outreach app with a Claude-like chat interface. User types a natural-language request, agent handles contact research, personalized email drafting, and sending via Gmail.

**Current state:** Empty repo (git init only). Everything from scratch.

---

## Sprint Task 1: Chat UI Shell + App Scaffold (March 3)

### Step 1 — Project Scaffold
- Initialize React 18 + Vite project (`npm create vite@latest . -- --template react`)
- Install dependencies: `react-router-dom`, `tailwindcss`, `@tailwindcss/vite`, `react-markdown`
- Install shadcn/ui: `npx shadcn@latest init` + add `button`, `input`, `card`, `scroll-area` components
- Create `.gitignore` for node_modules, dist, .env, etc.
- Set up directory structure per spec: `src/pages/`, `src/components/`, `src/lib/`, `src/data/`

### Step 2 — Design Tokens & Global Styles
- Configure Tailwind with custom theme in `index.css`:
  - Background: warm cream `#f5f5f0`
  - Primary accent: coral/orange `#cd6f47`
  - Text: dark gray/near-black
- Set up CSS variables for the shadcn theme using the coral/cream palette
- Apply global body styles (cream background, system font stack)

### Step 3 — App Router Shell
- `App.jsx`: Set up React Router with a single `/` route pointing to `Chat.jsx`
- Placeholder top-level state for conversations (to be wired to LocalStorage in Task 2)

### Step 4 — ChatInput Component
- Rounded-full input bar, bottom-anchored (sticky/fixed to viewport bottom)
- Send button with coral accent
- Submit on Enter, disable when empty
- Mobile-responsive (full-width with padding)

### Step 5 — MessageBubble Component
- Two visual styles: `user` (right-aligned, coral bg) and `agent` (left-aligned, white/light bg)
- Renders markdown content via `react-markdown`
- Rounded corners, subtle shadow on agent bubbles
- Timestamp display

### Step 6 — MessageList Component
- Scrollable container for message bubbles
- Auto-scroll to bottom on new message
- Takes up remaining vertical space (flex-grow between header and input)

### Step 7 — Chat Page Assembly
- `pages/Chat.jsx`: Wire together MessageList + ChatInput
- Local state: `messages` array following the message schema from the spec
- On user submit: add user message to state, show a mock agent reply (echo or placeholder) to prove the wiring works
- Mobile-responsive single-column layout

### Step 8 — Verify & Commit
- Confirm: typing a message shows it as a styled chat bubble (the "done when" criteria)
- Run dev server, visual check
- Commit and push

---

## Sprint Task 2: Sidebar + Multi-Chat (March 4)

### Steps (high-level)
- ChatSidebar component (slide-out, mobile hamburger toggle)
- "+" FAB button to create new chat
- Chat list with titles derived from first user message
- `chatStore.js` — LocalStorage read/write for conversations
- Switch between chats (load/save on switch)
- ThinkingIndicator component (animated dots + status text)
- Verify: multiple chats persist across page refresh

---

## Sprint Task 3: Contact Research Flow (March 5)

### Steps (high-level)
- Create `data/contacts.json` with 15 realistic hardcoded contacts
- `lib/contacts.js` — keyword matching logic (tags, role, company, location)
- ContactCard component with Keep/Remove toggle
- Agent message type `contacts` renders a list of ContactCards
- "Continue with N contacts" action button
- Wire into chat flow: user request → agent searches → shows contact cards

---

## Sprint Task 4: AI Email Drafting (March 6)

### Steps (high-level)
- `lib/claude.js` — Claude API integration (POST to /v1/messages)
- Prompt template from spec (personalized cold email, JSON response)
- EmailPreviewCard component with Edit/Confirm actions
- Inline editing via textarea
- "Send all" button appears when all emails confirmed
- Wire into chat flow: confirmed contacts → agent drafts → email preview cards

---

## Sprint Task 5: Gmail Integration + Send (March 7)

### Steps (high-level)
- Google OAuth2 flow (client-side implicit or auth code)
- Gmail API send (compose MIME message, POST to /gmail/v1/users/me/messages/send)
- Send animation + per-email status (sending/sent/failed)
- Error handling (auth expired, rate limits, invalid recipient)
- CampaignSummary card (sent count, failed count, open tracking placeholder)

---

## Sprint Task 6: Polish + Deploy + Demo (March 8)

### Steps (high-level)
- Loading states and skeleton loaders
- Micro-interactions (message appear animation, card transitions)
- Error handling for all failure modes
- Deploy to Vercel (`vercel --prod`)
- Record 60-second demo video of full flow
