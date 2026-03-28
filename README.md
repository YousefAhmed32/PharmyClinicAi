# PharmaClinic — Full-Stack Pharmacy eCommerce Platform

A production-ready MERN stack pharmacy platform with bilingual support (Arabic 🇪🇬 / English 🇺🇸).

## 🏗 Project Structure

```
pharmyclinic/
├── client/           # React 18 + Vite frontend
│   ├── src/
│   │   ├── api/          # Axios + API services
│   │   ├── components/   # Layouts, UI components
│   │   ├── hooks/        # Custom hooks
│   │   ├── i18n/         # AR/EN translations
│   │   ├── pages/        # All pages + admin pages
│   │   ├── store/        # Zustand stores
│   │   └── utils/        # Utilities
│   └── package.json
└── server/           # Node.js + Express backend
    ├── config/       # DB + Socket.io config
    ├── controllers/  # Route handlers
    ├── middlewares/  # Auth, upload, rate-limit
    ├── models/       # Mongoose schemas
    ├── repositories/ # Data access layer
    ├── routes/       # API routes
    ├── services/     # Business logic
    └── utils/        # Helpers + validators
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, etc.
npm install
npm run seed   # optional: seed demo data
npm start
```

### 2. Frontend Setup
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

### One-command Start (Mac/Linux)
```bash
chmod +x start-mac-linux.sh
./start-mac-linux.sh
```

### One-command Start (Windows)
```
start-windows.bat
```

## 🌍 Language Support
- **Arabic (RTL)** — default
- **English (LTR)** — toggle via navbar or profile settings

## 🔐 Demo Credentials
| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@pharmyclinic.com | Admin@123456 |
| User  | test@pharmyclinic.com | User@123456 |

## ✨ Features
- 🛒 Full eCommerce (cart, checkout, orders, returns)
- 👨‍⚕️ Appointment booking system
- 💊 Drug interaction checker
- 📋 Prescription upload
- 🤖 AI assistant chat
- 💬 Live support chat (Socket.io)
- 🔔 Real-time notifications
- 📊 Admin dashboard with analytics
- 📦 Inventory management
- 🖨️ Barcode print system
- 📝 Blog / health articles
- 🌍 Full AR/EN i18n with RTL support
