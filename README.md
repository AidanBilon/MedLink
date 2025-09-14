# MedLink

MedLink is a modern web application designed to connect users with health and wellness resources, provide up-to-date medical news, and offer a seamless experience for managing appointments and accessing health tips.

## Features

- **Health & Wellness Tips:**
  - Displays featured articles from the World Health Organization (WHO) and Canada’s Food Guide.
  - Consistent card-based UI with article previews, images, and source logos.
- **Medical News:**
  - Fetches and displays the latest medical news from trusted sources.
- **Appointments Management:**
  - Sidebar displays upcoming appointments.
  - Appointments persist and load automatically on first page load.
- **Authentication:**
  - Secure login with branded MedLink logo and custom background.
- **Custom UI:**
  - Main content areas feature a branded background image.
  - Responsive design with header, footer, and side panels unaffected by background.

## Tech Stack

- **Frontend:** React, Reactstrap, Context API, Custom CSS
- **Backend:** Node.js, Express, Cheerio, node-fetch
- **Assets:** SVG/PNG images for branding and article sources

## Project Structure

```
api-server.js           # Express backend for API endpoints
server.js               # Main server entry point
src/
  App.js                # Main React app and routing
  components/           # Reusable UI components (NavBar, Footer, etc.)
  views/                # Main pages (Home, HealthTips, Profile, etc.)
  assets/               # Images and logos
  utils/                # Utility functions and context
public/                 # Static files and index.html
```

## Setup & Running Locally

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd MedLink
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Start the backend server:**
   ```sh
   node api-server.js
   ```
4. **Start the frontend (in a new terminal):**
   ```sh
   npm start
   ```
5. **Access the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

- `/api/featured-health` — Returns featured WHO article (JSON)
- `/api/featured-food` — Returns featured Canada Food Guide article (JSON)
- Additional endpoints for news and appointments as needed

## Customization

- **Background Image:** Replace `MedLink_Background.png` in `src/assets/` for a different look.
- **Logos:** Update `logo.svg`, `who-logo.png`, or `gov-can-logo.png` in `src/assets/` as needed.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
Auth0 helps you to:


