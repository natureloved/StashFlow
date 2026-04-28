# Stashflow | Save with purpose

**Goal-based DeFi savings powered by LI.FI Earn**

DeFi made simple. Set goals, and earn yield while you wait. Stashflow is a decentralized platform that allows users to easily manage their savings goals, deposit into yield-generating vaults, and monitor their portfolio seamlessly.

## Features

- **Goal-Based Savings:** Create specific financial goals and track your progress.
- **Yield Generation:** Earn yield on your deposits powered by the LI.FI Earn API.
- **Portfolio Monitoring:** Keep track of your on-chain USD balances, vaults, and total stash.
- **Web3 Integration:** Seamlessly connect your wallet using RainbowKit and Wagmi.
- **Modern UI:** Built with Framer Motion, Tailwind CSS, and Shadcn UI for a sleek and responsive experience.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Frontend:** [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Web3:** [Wagmi](https://wagmi.sh/), [Viem](https://viem.sh/), [RainbowKit](https://www.rainbowkit.com/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Backend/DB:** [Supabase](https://supabase.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/)

## Getting Started

First, clone the repository and install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Environment Variables

Create a `.env.local` file in the root directory and add the necessary environment variables for your project (Supabase keys, WalletConnect project ID, etc.).

### Run the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new). Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
