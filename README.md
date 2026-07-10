# PreExam (PreExamV2)

PreExam is an advanced, AI-powered examination preparation and generation platform. It offers a comprehensive suite of tools for generating exams, managing users, integrating payments, and exporting results. 

## Features

- **AI-Powered Exam Generation:** Utilize state-of-the-art AI models (OpenAI, Google GenAI, Anthropic) to generate intelligent and context-aware exam questions.
- **Full-Stack Application:** Built with a modern Next.js frontend and a custom Node.js server.
- **Robust Database:** Powered by SQLite with Sequelize ORM for reliable data management.
- **User Authentication:** Secure login via Firebase, Google OAuth, Facebook Login, and JWT.
- **Payment Integration:** Seamless payment processing with Stripe and PromptPay QR.
- **Rich Media & Export:** Export exams to PDF (`jspdf`) and Excel (`xlsx`), with image compression and processing capabilities (`sharp`, `html-to-image`).
- **Real-time Capabilities:** Integrated Socket.IO for real-time features.
- **Background Workers & Scrapers:** Dedicated services for background processing and data scraping.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Framer Motion, React Quill
- **Backend:** Node.js (custom server), Sequelize, SQLite
- **AI Integrations:** `@google/genai`, `@anthropic-ai/sdk`, `openai`
- **Authentication:** Firebase Admin, Google OAuth, Facebook Login, JWT
- **Payments:** Stripe, PromptPay QR

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jetz001/PreExam.git
   cd PreExamV2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Configure your `.env` file in the root directory with the necessary API keys for Firebase, Stripe, AI services, and database credentials.

4. **Run the Development Server:**
   This project uses a custom Node.js server for development.
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Using the Worker

The `worker` directory contains a Cloudflare Worker used for background tasks and specific microservices. It is built with TypeScript and managed using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

1. **Navigate to the worker directory:**
   ```bash
   cd worker
   ```

2. **Install worker dependencies:**
   ```bash
   npm install
   ```

3. **Run the worker in development mode:**
   ```bash
   npm run dev
   ```
   This will start a local server using `wrangler dev`.

4. **Deploy the worker:**
   ```bash
   npm run deploy
   ```

## Project Structure

- `/src` - Next.js application frontend.
- `/server` - Custom Node.js backend server.
- `/exam-generator` - Logic and services for AI exam generation.
- `/scraper` - Data scraping utilities.
- `/worker` - Background worker processes.
- `/public` - Static assets.

## Deployment

### Frontend (Cloudflare Pages)

The frontend is configured to be deployed to **Cloudflare Pages** via GitHub integration.

**Deployment Settings in Cloudflare:**
- **Build command:** `npm run build`
- **Build output directory:** `out`
- **Environment Variables:** Make sure to set necessary environment variables such as `NEXT_PUBLIC_VITE_API_URL`.

### Backend (Node.js Server)

To build and start the custom Node.js application server in a production environment:

```bash
npm run build
npm run start
```
