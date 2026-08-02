# Discord Member Scraper

A Chrome/Edge browser extension that helps you scrape and export member lists from Discord servers. It integrates a Vite + React + Tailwind CSS stack, making it fast and modern.

## Features

- Scrapes member lists from Discord servers.
- Exports the gathered data into manageable formats (CSV/Excel).
- Built with React and styled with Tailwind CSS via shadcn/ui components.
- Uses Vite for fast builds and hot module replacement during development.

## Development Setup

1. **Install Dependencies**
   Make sure you have Node.js and `npm` (or `pnpm`/`yarn`) installed.

   ```bash
   npm install
   ```

2. **Run Development Server**

   ```bash
   npm run dev
   ```

   This will start the Vite server.

3. **Load the Extension into the Browser**
   - Go to `chrome://extensions/` or `edge://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the directory containing this code.
   - Vite's Hot Module Replacement (HMR) will automatically update the extension as you make changes.

## Building for Production

```bash
npm run build
```

This generates a production-ready extension in the `dist` folder. You can load this folder into your browser or zip it to publish to the Web Store.

## Tech Stack

- **Framework:** React 18
- **Bundler:** Vite 4 + @crxjs/vite-plugin
- **Styling:** Tailwind CSS + Radix UI
- **Messaging:** webext-bridge
