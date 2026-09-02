/project-root
├─ package.json
├─ .env.example
├─ src
│  ├─ server.js
│  ├─ db.js
│  ├─ config
│  │  └─ index.js
│  ├─ models
│  │  ├─ user.model.js
│  │  ├─ refreshToken.model.js
│  │  └─ profile.model.js
│  ├─ presenters
│  │  ├─ auth.presenter.js
│  │  └─ profile.presenter.js
│  ├─ views
│  │  ├─ auth.routes.js
│  │  ├─ profile.routes.js
│  │  └─ me.routes.js
│  ├─ middlewares
│  │  ├─ auth.middleware.js
│  │  └─ error.middleware.js
│  └─ utils
│     ├─ tokens.util.js
│     ├─ cookies.util.js
│     └─ validators.js
└─ README.md


#What I changed & why (short)

Separation of concerns: DB queries are in models/; business logic (token rotation, validation) in presenters/; request/response formatting & cookies in views/.

Testability: Presenters can be unit-tested without Express.

Easier maintenance: If DB schema changes, only models change; business rules live in presenters.

Same behavior: Token rotation, hashed refresh tokens, cookie-based refresh, profile upsert — all preserved.

