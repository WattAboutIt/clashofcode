# Clash of Code: Multiplayer Coding Battle System

## 📌 1. Project Title

**Clash of Code** is a multiplayer coding battle platform where developers compete in real-time coding challenges. Users can create rooms, join battles, and climb the leaderboard in a competitive coding arena.

-----

## 📖 2. Overview

Clash of Code is a web application that lets developers battle each other by solving coding problems as fast as possible. It's like a competitive coding game where speed and accuracy matter.

### What Users Can Do:
- **Login/Register**: Create an account or sign in to access the platform.
- **Create Room**: Start a new battle room and invite others.
- **Join Room**: Enter a room code to join an existing battle.
- **Battle**: (Future feature) Compete in real-time coding challenges.
- **View Profile**: Check personal stats like wins, losses, and ranking.

This is a real-time multiplayer system, meaning multiple users can interact in the same room at the same time. The app is built to handle live updates and shared experiences.

---

## 🛠️ 3. Tech Stack

### Frontend:
- **React**: A JavaScript library for building user interfaces.
- **Vite**: A fast build tool for React projects.
- **React Router v6**: Handles navigation between different pages.
- **Context API**: Manages shared data across the app (like user login status).
- **Axios**: A tool to make HTTP requests to the backend.

### Backend:
- **FastAPI** (or Node.js): A framework to build the server-side logic.
- **JWT Authentication**: A secure way to verify users with tokens.
- **WebSocket**: (Future) For real-time communication between users.

### Styling:
- **CSS Modules or Global Styles**: Custom CSS for visual design.
- **Dark/Light Mode System**: Switch between dark and light themes.

---

## 📁 4. Project Structure

The project is organized into folders to keep things neat and easy to find. Here's the main structure for the frontend:

```
src/
 ├── api/
 │    └── axios.js          # Handles all API calls to the backend
 ├── components/
 │    ├── Navbar.jsx        # The top navigation bar
 │    ├── ProtectedRoute.jsx # Checks if user is logged in
 │    └── ui/               # Reusable UI parts like buttons and cards
 ├── context/
 │    ├── AuthContext.jsx   # Manages user login state
 │    └── ThemeContext.jsx  # Manages dark/light mode
 ├── pages/
 │    ├── Home.jsx          # Landing page
 │    ├── Login.jsx         # Login form
 │    ├── Register.jsx      # Sign-up form
 │    ├── Dashboard.jsx     # User dashboard
 │    ├── CreateRoom.jsx    # Create a new battle room
 │    ├── BattleRoom.jsx    # The battle lobby
 │    ├── Profile.jsx       # User stats page
 │    └── Leaderboard.jsx   # Rankings
 ├── styles/
 │    ├── global.css        # Main styles
 │    ├── theme.css         # Theme setup
 │    ├── dark.css          # Dark mode styles
 │    └── light.css         # Light mode styles
 ├── hooks/                 # Custom React hooks (if needed)
 ├── utils/
 │    └── socket.js         # WebSocket setup (for future real-time features)
 ├── App.jsx                # Main app component
 ├── main.jsx               # Entry point
 └── index.css              # Additional styles
```

### Explanation of Each Folder:
- **api/**: Contains files for talking to the backend server.
- **components/**: Reusable parts of the UI, like buttons or navigation.
- **context/**: Shared data that multiple parts of the app need, like user info.
- **pages/**: Each page of the website, like Home or Login.
- **styles/**: CSS files for making the app look good.
- **hooks/**: Special functions for React logic.
- **utils/**: Helper tools, like WebSocket connection.

---

## 🔐 5. Authentication Flow (Very Important)

Authentication is how we make sure users are who they say they are. Here's how it works step-by-step:

1. **User Logs In**: The user fills out the login form with email and password.
2. **Frontend Sends Request**: The app sends the login info to the backend.
3. **Backend Validates**: The server checks if the email and password are correct.
4. **Backend Returns Data**: If correct, the server sends back:
   - A JWT token (a special code proving the user is logged in).
   - User data (like username and email).
5. **Frontend Stores Data**: The app saves the token and user info in localStorage (browser storage).
6. **Context Updates**: The AuthContext (shared state) is updated with the user info.
7. **UI Updates**: The app shows the user as logged in (e.g., dashboard appears).

### On Refresh:
- The app checks localStorage for the token.
- If found, it restores the user session automatically.

### Simple Diagram:

```
User → Login Form → Frontend → API Call → Backend → Validates → Returns JWT → Frontend Stores → AuthContext → UI Updates
```

This flow keeps users logged in even after closing the browser.

---

## 🛡️ 6. Authorization (Protected Routes)

Authorization controls who can access certain pages. We use a component called `ProtectedRoute` to check if a user is logged in.

### How It Works:
- If the user has a valid token (stored in localStorage), they can access protected pages.
- If no token, they are redirected to the login page.

### Protected Pages:
- **Dashboard**: Shows user stats and quick actions.
- **Create Room**: Lets users start new battles.
- **Battle Room**: The actual battle lobby.
- **Profile**: Personal stats and info.

Example: If a user tries to visit `/dashboard` without logging in, they go to `/login` instead.

---

## 🏠 7. Room System (Core Feature)

The room system lets users create and join battle rooms. It's the heart of the multiplayer experience.

### Create Room Flow:
1. User clicks "Create Room" on the dashboard.
2. Frontend sends a request to the backend.
3. Backend creates a new room with a unique code (like "ABC123").
4. Room data is stored: host (creator), players list, status ("waiting").
5. Frontend redirects to the battle room page with the code.

### Join Room Flow:
1. User enters a room code in the "Join Room" form.
2. Frontend sends the code to the backend.
3. Backend checks if the room exists and isn't full.
4. User is added to the room's players list.
5. Both users (host and joiner) see the updated lobby.

### Room Data Structure:
A room is an object that looks like this:

```javascript
{
  roomCode: "ABC123",     // Unique code for the room
  host: {                  // The user who created the room
    username: "Coder1",
    id: 123
  },
  players: [               // List of users in the room
    { username: "Coder1", status: "ready" },
    { username: "Coder2", status: "waiting" }
  ],
  status: "waiting"        // Can be "waiting", "active", etc.
}
```

---

## 🔄 8. Data Flow (Very Important)

Data flow shows how information moves through the system. Let's break it down by feature.

### Login Flow:
```
User → Types in Login Form → Frontend → Axios API Call → Backend Server → Checks Database → Returns JWT Token → Frontend Stores in localStorage → Updates AuthContext → Shows Dashboard
```

### Room Flow:
```
User A → Clicks "Create Room" → Frontend → API Call to /rooms/create → Backend → Generates Room Code → Stores Room → Returns Room Data → Frontend → Redirects to /battle-room/ABC123

User B → Enters Room Code → Frontend → API Call to /rooms/join → Backend → Adds User B to Room → Returns Updated Room → Frontend → Shows Shared Lobby
```

This ensures all users see the same room state.

---

## 🌍 9. Global State Management

Global state is data shared across the entire app. We use React Context for this.

### AuthContext:
- **Stores**: Current user info and JWT token.
- **Provides**: Functions like `login()`, `logout()`.
- **Syncs**: With localStorage so data persists on refresh.

### ThemeContext:
- **Stores**: Current theme ("dark" or "light").
- **Provides**: `toggleTheme()` function.
- **Syncs**: With localStorage and updates the page's CSS.

These contexts make it easy to access user data or theme settings from any component.

---

## 🌐 10. Axios Setup

Axios is our tool for talking to the backend. We set it up once and use it everywhere.

### Key Features:
- **Centralized**: One main API instance in `src/api/axios.js`.
- **Base URL**: Points to the backend server (e.g., `http://localhost:5000`).
- **JWT Interceptor**: Automatically adds the JWT token to every request.

Example of how it works:
```javascript
// When making a request, Axios adds:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This means every API call is automatically authenticated.

---

## 👤 11. Profile System

The profile page shows user statistics and info.

### Features:
- **User Info**: Username, email.
- **Stats**: Games played, wins, losses, ranking (future feature).

### Backend Endpoints:
- `GET /user/profile`: Gets basic user info.
- `GET /user/stats`: Gets game statistics.

The frontend fetches this data when the profile page loads and displays it in cards.

---

## 🌙 12. Dark/Light Mode System

Users can switch between dark and light themes.

### How It Works:
- **Theme Stored**: In ThemeContext and localStorage.
- **Toggle**: Button in the navbar switches modes.
- **CSS Files**:
  - `dark.css`: Styles for dark mode (black backgrounds, white text).
  - `light.css`: Styles for light mode (white backgrounds, dark text).

The app remembers the user's choice even after refresh.

---

## ⚡ 13. Future Feature: Real-Time Battle (WebSocket)

For live battles, we'll use WebSockets for instant updates.

### Concept:
- WebSocket connects users in the same room.
- Real-time events: Player joined, game started, code changes.
- Backend manages connections and broadcasts updates.

### Example Events:
- `join_room`: User enters a room.
- `leave_room`: User exits.
- `start_game`: Host begins the battle.
- `update_state`: Syncs room data.

This will make battles feel live and interactive.

---

## 🚀 14. How to Run the Project

### Frontend:
1. Open terminal in the `frontend` folder.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.

### Backend:
1. Open terminal in the `backend` folder.
2. Run `pip install -r requirements.txt` (for Python/FastAPI).
3. Run `uvicorn app.main:app --reload` to start the server.

Visit `http://localhost:5173` for the frontend and `http://localhost:5000` for the backend.

---

## 📚 15. Learning Flow (Beginner Friendly)

Start simple and build up:

1. **Learn Login System**: Understand forms, API calls, and storing data.
2. **Understand Token Storage**: See how JWT works and localStorage.
3. **Learn Protected Routes**: How to block pages for non-logged-in users.
4. **Understand API Calls**: How Axios talks to the backend.
5. **Learn Room System**: Creating and joining rooms.
6. **Learn Real-Time Later**: Add WebSockets for live features.

Take it one step at a time!

---

## 🎯 16. Final Summary

Clash of Code is a scalable multiplayer coding platform built with clean, modular code. It's designed for competitive coding battles with secure authentication, room-based gameplay, and future real-time features. The architecture separates concerns (frontend for UI, backend for logic) and uses modern tools like React and JWT for a smooth user experience. Ready to expand with WebSockets for live battles!</content>
<parameter name="filePath">README.md
