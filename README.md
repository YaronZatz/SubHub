
# SubHub

A high-performance aggregator that uses **Google Gemini AI** to parse messy Facebook sublet posts into structured data displayed on an interactive map.

## Features

-   **AI-Powered Extraction**: Paste a Facebook post URL or text, and Gemini 3 extracts price, dates, location, amenities, and images.
-   **Interactive Map**: Visualize listings on a Leaflet map.
-   **Local Persistence**: Listings and user sessions are stored locally using IndexedDB and LocalStorage (Serverless MVP).
-   **Authentication**: Firebase Auth when configured; otherwise a **development-only mock** (localStorage). Mock auth is disabled in production—configure Firebase for real deployments.
-   **Responsive Design**: Built with Tailwind CSS for mobile and desktop.

## Tech Stack

-   **Frontend**: React 19, TypeScript
-   **Styling**: Tailwind CSS
-   **Maps**: Leaflet / React-Leaflet
-   **AI**: Google GenAI SDK (Gemini 3 Flash/Pro)
-   **Storage**: IndexedDB (via native API)

## Setup

1.  Clone the repository.
    ```bash
    git clone https://github.com/Yaronzatz/SubHub.git
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy `.env.example` to `.env.local` and fill in values. **Never commit real keys.**  
    - Use **server-side only** for secrets: `GEMINI_API_KEY`, `APIFY_API_TOKEN`, etc. (do not prefix with `NEXT_PUBLIC_`).  
    - Use `NEXT_PUBLIC_*` only for client-safe config (e.g. Firebase client SDK: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`).
4.  Run the development server.
