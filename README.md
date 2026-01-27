
# SubHub

A high-performance aggregator that uses **Google Gemini AI** to parse messy Facebook sublet posts into structured data displayed on an interactive map.

## Features

-   **AI-Powered Extraction**: Paste a Facebook post URL or text, and Gemini 3 extracts price, dates, location, amenities, and images.
-   **Interactive Map**: Visualize listings on a Leaflet map.
-   **Local Persistence**: Listings and user sessions are stored locally using IndexedDB and LocalStorage (Serverless MVP).
-   **Authentication**: Mock authentication system for posting and claiming listings.
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
3.  Set your API Key in the environment (or ensuring `process.env.API_KEY` is available via your build tool).
4.  Run the development server.
