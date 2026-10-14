<div align="center">

# Vibely API

**REST and real-time backend for Vibely, a social platform with feeds, chat, videos and a marketplace.**

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

[Frontend repo](https://github.com/aqib-codespace/Vibely-frontend) · [Live app](https://vibely-lake.vercel.app)

</div>

---

## Overview

Vibely API powers the [Vibely web app](https://github.com/aqib-codespace/Vibely-frontend). It handles accounts, posts, friendships, one-to-one chat, short videos, a buy-and-sell marketplace with buyer–seller messaging, notifications and global search. REST endpoints live under `/api/v1`, and Socket.IO delivers messages and typing indicators in real time.

## Features

| Area | What it does |
| --- | --- |
| **Accounts** | Sign up, sign in, email verification codes, resend verification, forgot / reset password, change password, profile updates, user stats |
| **Feed** | Posts with up to 4 media files, likes, per-user timelines, single-post view, delete |
| **Friends** | Send, accept, reject and cancel friend requests; friends list |
| **Chat** | One-to-one chats with media messages, edit, delete, reactions, read receipts, message search and custom chat wallpapers |
| **Videos** | Video feed with likes, saves, single-video view and delete |
| **Marketplace** | Listings with up to 5 images, per-user listings, buyer–seller chat with block, archive, search and stats |
| **Notifications** | Notification list, mark one or all as read |
| **Search** | Global search across users, posts, videos and marketplace items, plus suggestions |
| **Real time** | Socket.IO rooms per user and per chat for new, edited and deleted messages, reactions, read receipts, typing indicators and live notifications |

## Tech stack

| Layer | Tools |
| --- | --- |
| Runtime | Node.js (ES modules), Express |
| Database | MongoDB with Mongoose |
| Real time | Socket.IO |
| Auth | JSON Web Tokens, bcrypt password hashing |
| Validation | Joi |
| Media | Multer uploads to Cloudinary |
| Email | Nodemailer (SMTP) |

## Architecture

Every feature is a self-contained module with the same five layers, so new features follow a predictable pattern:

```
src/
├── server.js                 # Express app, HTTP server and Socket.IO bootstrap
├── routes/index.js           # Mounts every module under /api/v1
├── config/                   # MongoDB connection, Cloudinary client
├── middleware/               # JWT auth, error handler, Multer upload config
├── modules/
│   └── <feature>/
│       ├── router.js         # Routes and middleware
│       ├── validations.js    # Joi request schemas
│       ├── controller.js     # HTTP layer: parse request, send response
│       ├── services.js       # Business logic
│       └── model.js          # Mongoose schema
├── constants/                # Enums and response messages
└── utils/                    # Socket.IO server, tokens, email, Cloudinary helpers, errors
```

Modules: `users`, `feed`, `friend-requests`, `chat`, `videos`, `market-place`, `marketplace-chat`, `product-chat`, `notifications`, `search`.

## API overview

All routes are prefixed with `/api/v1`. Protected routes expect `Authorization: Bearer <token>`.

| Base path | Purpose |
| --- | --- |
| `/users` | Auth, verification, password reset, profiles, stats |
| `/feed` | Posts and likes |
| `/friends` | Friend requests and friends list |
| `/chats` | Chats, messages, reactions, wallpapers |
| `/videos` | Video feed, likes, saves |
| `/marketPlace` | Marketplace listings |
| `/marketplace-chat` | Buyer–seller conversations |
| `/product-chats` | Product enquiry chats |
| `/notifications` | Notifications |
| `/search` | Global search and suggestions |

### Socket.IO events

Clients connect with `auth: { token }` in the handshake and are placed in a private room for their user ID.

| Client emits | Effect |
| --- | --- |
| `join chat` / `join product chat` / `join marketplace chat` | Join a conversation room |
| `typing` / `stop typing` | Typing state for direct chats |
| `product typing` / `stop product typing` | Typing state for product chats |
| `marketplace typing` / `stop marketplace typing` | Typing state for marketplace chats |

| Server emits | When |
| --- | --- |
| `connected` | The socket is authenticated |
| `new message` / `new product message` / `new marketplace message` | A message is sent to the room |
| `message edited` / `message deleted` / `message reaction` | A message changes |
| `messages read` | The other user reads the conversation |
| `new_notification` | A notification is created for the user |

## Getting started

**Requirements:** Node.js 18+, a MongoDB database (local or Atlas), a Cloudinary account and SMTP credentials.

```bash
git clone https://github.com/aqib-codespace/vibely-backend.git
cd vibely-backend
npm install
```

Create a `.env` file in the project root:

```bash
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/vibely

JWT_SECRET_TOKEN=a-long-random-secret
JWT_TOKEN_EXPIREY=1d
REFRESH_TOKEN_EXPIREY=7d

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=you@example.com
EMAIL_PASS=your-smtp-password

# Optional: exposes GET /api/v1/internal/email-test to check SMTP settings
ALLOW_EMAIL_TEST_ROUTE=false
```

Run the server:

```bash
npm run dev     # with nodemon
npm start       # production
```

## Security notes

- Passwords are hashed with bcrypt and stripped from user responses.
- REST routes and the Socket.IO handshake both verify the JWT.
- Request bodies and params are validated with Joi before reaching the services.
- The SMTP test route is only mounted when `ALLOW_EMAIL_TEST_ROUTE=true`; keep it off in production.

## Author

Built by **Muhammad Aqib**, full-stack and automation engineer.

[Portfolio](https://aqib-portfolio-mern.vercel.app) · [LinkedIn](https://www.linkedin.com/in/aqib-engineer2/) · [GitHub](https://github.com/aqib-codespace)
