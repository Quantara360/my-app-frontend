# Login & Routing Configuration Guide

## Reference Repository: https://github.com/Quantara360/my-app-frontend.git

### Routing Structure

The application uses **Expo Router** with file-based routing. Here's the complete routing hierarchy:

```
src/app/
├── _layout.tsx              # Root layout wrapping app with AuthProvider
├── index.tsx                # Root route "/" - redirects based on auth state
├── login.tsx                # Login page - "/login"
├── register.tsx             # Registration page - "/register"
├── admin.tsx                # Admin dashboard - "/admin"
├── approvals.tsx            # Approvals page - "/approvals"
├── assets.tsx               # Assets page - "/assets"
├── chemicals.tsx            # Chemicals page - "/chemicals"
├── workers.tsx              # Workers page - "/workers"
├── machineries.tsx          # Machineries page - "/machineries"
├── add-image.tsx            # Add Image page - "/add-image"
├── face-recognition.tsx     # Face Recognition - "/face-recognition"
├── mark-attendance.tsx      # Mark Attendance - "/mark-attendance"
├── (tabs)/                  # Tab-based routing group
│   ├── _layout.tsx          # Tab navigator layout
│   ├── home.tsx             # Home tab
│   └── explore.tsx          # Explore tab
└── dashboard/               # Dashboard group
    ├── index.tsx            # Main dashboard
    └── [worksite].tsx       # Dynamic worksite route
```

### Login Flow

#### 1. **Root Entry Point** (`src/app/index.tsx`)

```typescript
// Redirects based on authentication state:
// - If user exists and is admin → redirect to /admin
// - If user exists (non-admin) → redirect to /dashboard
// - If no user → redirect to /login
```

**Logic:**

```typescript
const { user } = useAuth();

return (
  <Redirect
    href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login"}
  />
);
```

#### 2. **Login Page** (`src/app/login.tsx`)

- Form: Email + Password + Remember Me checkbox
- On successful login: Uses `signIn()` from AuthContext
- Redirects to dashboard or admin based on user role
- Stores token & user data in SecureStore + localStorage

#### 3. **Register Page** (`src/app/register.tsx`)

- Form: Username + Email + Password + Role selection
- Roles: "supervisor" or "officeStaff"
- Uses `registerWithApi()` from authService

### Authentication Context (`src/contexts/AuthContext.tsx`)

**Key Features:**

- Manages `user` and `token` state
- Persists auth data to SecureStore (mobile) + localStorage (web)
- `restoreAuth()`: Fetches fresh user data from API on app start
- Fallback to cached user if backend unreachable

**Storage Keys:**

- `auth_token`: JWT token
- `auth_user`: User object (JSON)

### Auth Service (`src/services/authService.ts`)

**Key Functions:**

- `loginWithApi(email, password)`: POST to `/api/login`
- `registerWithApi(data)`: POST to `/api/register`
- `getAuthToken()`: Retrieves token from SecureStore/localStorage
- `setInMemoryToken(token)`: Sets token for API requests

### Protected Route Pattern

All pages (except login/register) use AuthContext:

```typescript
const { user } = useAuth();

useEffect(() => {
  if (!user) {
    router.replace("/login");
  }
}, [user, router]);
```

### API Base URL

- **Environment Variable**: `REACT_APP_API_HOST`
- **Default**: Loaded from `.env` file
- Used for all API requests in authService

### Key Roles & Redirects

| Role        | Redirect After Login |
| ----------- | -------------------- |
| admin       | /admin               |
| supervisor  | /dashboard           |
| officeStaff | /dashboard           |

### Theme Integration

- Uses `useTheme()` hook for styling
- Uses `useColorScheme()` for dark/light mode
- Max content width: `MaxContentWidth` constant

---

## Implementation Checklist for Current Project

- [ ] Copy AuthContext from reference (`src/contexts/AuthContext.tsx`)
- [ ] Copy AuthService from reference (`src/services/authService.ts`)
- [ ] Implement login.tsx with email/password form
- [ ] Implement register.tsx with role selection
- [ ] Update index.tsx with redirect logic
- [ ] Update \_layout.tsx to wrap with AuthProvider
- [ ] Add `.env` with `REACT_APP_API_HOST`
- [ ] Ensure SecureStore + localStorage integration
- [ ] Test login flow → redirect to dashboard
- [ ] Test admin redirect
- [ ] Test token persistence on app refresh
