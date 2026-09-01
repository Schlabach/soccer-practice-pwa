# Soccer Practice Coach PWA

A local-only youth soccer practice planner and player evaluation app.

## Features

- Add your own players and grades
- Add/edit practice sections and durations
- Add/remove evaluation categories
- Rate each player from 1–5
- Store player notes
- Automatically calculate rating averages
- Print the practice plan / evaluation sheet
- PWA install support
- Offline support after first load
- All player data stays in `localStorage`

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages

1. Create a GitHub repository.
2. Copy this project into it.
3. Push to the `main` branch.
4. In GitHub, go to **Settings → Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. The included workflow will build and deploy the app.

The Vite config detects the GitHub repository name during GitHub Actions and automatically sets the correct Pages base path.

## Privacy note

Player names, ratings, grades, and notes are stored only in the browser's `localStorage`.

They are not committed to GitHub and are not sent to a server.

However, clearing browser/site data will erase them. Different devices/browsers will have separate data.
