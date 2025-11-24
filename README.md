# Dripcheck: Ultimate Personal Finance Tracker



## 📊 Overview

Dripcheck is a comprehensive personal finance management application designed to help users take control of their financial life. Built with Next.js, TypeScript, and Supabase, it offers a wide range of features from expense tracking to investment management, all in a secure and user-friendly interface.

## 🌟 Key Features

### User Authentication & Security 🔐
- Secure email/password authentication via Supabase Auth
- JWT-based session management with proper expiration and refresh logic
- Strict server-side user identification only (no client-side fallback), ensuring consistent and secure user IDs across frontend and backend
- Comprehensive 401 handling when unauthenticated, protecting all finance data

### Intelligent Dashboard 📈
- Comprehensive overview of financial metrics
- Time-based filters for different views (daily, weekly, monthly)
- Financial health indicators and visualizations

### Financial Management Systems

#### Expense Tracking 📑
- Advanced expense entry with merchant intelligence and location data
- Transaction management with receipt upload and warranty tracking
- Split expense functionality for shared purchases
- Expense analytics with geo-tagging and time-of-day analysis

#### Income Management 💵
- Income tracking with support for multiple income types and frequencies
- Income source categorization (primary, passive, investment, side-hustle)
- Income analytics with diversification analysis and projections

#### Budgeting 💰
- Budget creation and management system
- Support for budget categories and subcategories
- Budget progress tracking and flexible budget models

#### Bill & Subscription Management 📅
- Comprehensive bill tracking with recurring payment support
- Accurate recurring-bill due-date generation without unintended date shifts
- Automatic status detection (Overdue / Due Soon / Upcoming) based on due date
- Robust server-side validation for amount and due-date inputs with clear UI error messages
- Subscription management with ROI calculator
- Bill calendar view for visualizing upcoming payments

#### Investment Portfolio Management 📈
- Investment tracking with multi-asset class support
- Portfolio allocation visualization and rebalancing recommendations
- Watchlist feature with real-time stock data via Finnhub API
- Price alerts and notification system for watchlist items

#### Net Worth Tracking 💼
- Asset and liability management with categorization
- Historical net worth tracking with trend visualization
- Detailed breakdown by category with progress visualization

#### Goal-based Financial Planning 🎯
- Goal creation and tracking with milestone management
- Progress visualization and priority matrix
- Goal relationship management for tracking dependencies

#### Tax Management System 📊
- Tax deduction tracking with category management
- Tax impact prediction for financial decisions
- Tax burden comparison and visualization
- Comprehensive tax analytics dashboard

#### Debt Management 💸
- Comprehensive debt tracking and management.
- Dynamic calculation of total debt balance and payoff progress.
- Secure endpoints for adding, updating, and deleting debts.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.2.4
- **Language**: TypeScript
- **UI Components**: 
  - Radix UI for accessible components
  - Tailwind CSS for styling
  - Framer Motion for animations
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation
- **Data Visualization**: 
  - Nivo (Bar, Sankey, Treemap)
  - Recharts
  - D3.js

### Backend
- **API Routes**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **External APIs**: Finnhub for financial data

### DevOps
- **Deployment**: Netlify
- **Version Control**: Git
- **CI/CD**: Netlify CI/CD pipeline

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm, yarn, or pnpm
- Supabase account for database and authentication
- Finnhub API key for investment data

### Environment Setup

1. Clone the repository
   ```bash
   git clone https://github.com/dracangelo/financehub.git
   cd financehub
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   FINNHUB_API_KEY=your_finnhub_api_key
   ```

4. Run the development server
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application

### Database Setup

The application requires a Supabase database with specific tables and schemas. To set up the database:

1. Create a new project in Supabase
2. Run the migration scripts located in the `supabase/migrations` directory
3. Alternatively, you can manually create the required tables using the SQL scripts in the `supabase/db` directory

## 📁 Project Structure

```
├── app/                  # Next.js App Router
│   ├── (auth)/           # Authentication routes
│   ├── (protected)/      # Protected routes requiring authentication
│   ├── api/              # API routes
│   └── components/       # App-specific components
├── components/           # Shared components
│   ├── auth/             # Authentication components
│   ├── ui/               # UI components
│   └── ...               # Feature-specific components
├── contexts/             # React context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and shared logic
├── public/               # Static assets
├── styles/               # Global styles
├── supabase/             # Supabase configuration and migrations
│   ├── db/               # Database scripts
│   └── migrations/       # Migration scripts
├── types/                # TypeScript type definitions
└── ...                   # Configuration files
```

## 🔧 Configuration

### Supabase Configuration

The application uses Supabase for database, authentication, and storage. The configuration is located in:

- `lib/supabase/client.ts` - Client-side Supabase client
- `lib/supabase/server.ts` - Server-side Supabase client
- `supabase/config.toml` - Supabase configuration

### Netlify Configuration

Deployment configuration for Netlify is defined in `netlify.toml`.

## 🧪 Testing

To run tests:

```bash
npm run test
# or
yarn test
# or
pnpm test
```

## 🚢 Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Configure the build settings:
   - Build command: `npm run netlify-build`
   - Publish directory: `out`
3. Add the required environment variables in Netlify's dashboard

## 🛡️ Security Considerations

- The application implements Row Level Security (RLS) in Supabase to ensure data privacy
- Authentication uses secure JWT tokens with proper expiration
- API routes include validation to prevent malicious inputs
- Client-side persistent ID management ensures consistent user identification

## 🔄 Recent Updates

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes and updates.

### Notable Recent Fixes

#### Watchlist System Fixes
- Fixed database error related to missing 'alert_threshold' column
- Implemented database setup system to ensure all required columns exist
- Enhanced user ID retrieval logic with clear priority order
- Fixed field name mismatches in the codebase

#### Debt Management Fixes
- Corrected total debt balance calculation for accuracy.
- Secured the debt deletion API to prevent unauthorized access.
- Replaced hardcoded data with live data in the debt overview.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team at support@dripcheck.example.com.

---

Built with ❤️ by the Dripcheck Team
