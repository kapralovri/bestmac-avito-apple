# BestMac - Used Apple Products Marketplace

## Overview
A Russian-language e-commerce website for buying and selling used MacBooks and iMacs. The site offers product listings, a trade-in/buyback program, and device selection services.

## Project Architecture
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: React Router DOM v6
- **Build Tool**: Vite
- **State Management**: TanStack React Query
- **Animations**: Framer Motion

## Project Structure
```
src/
├── assets/        # Static assets (images, etc.)
├── components/    # Reusable UI components
├── config/        # Configuration files
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
├── pages/         # Page components
├── services/      # API services
└── types/         # TypeScript type definitions
```

## Running the Application
- Development: `npm run dev` (runs on port 5000)
- Build: `npm run build`
- Preview: `npm run preview`

## Key Features
- Product catalog for used Apple devices
- Trade-in/buyback program (Выкуп)
- Device selection assistance (Подбор)
- Corporate sales (Для юр.лиц)

## Recent Changes
- 2026-01-09: Migrated from Lovable to Replit environment
  - Updated Vite config to use port 5000
  - Configured allowedHosts for Replit proxy support
