# 🌐 MedLink

MedLink is a modern web application that connects users with **health and wellness resources**, provides **up-to-date medical news**, and offers a seamless experience for **managing appointments** and accessing personalized **health tips**.

---

## ✨ Features

- **💡 Health & Wellness Tips**
  - Curated articles from the **World Health Organization (WHO)** and **Canada’s Food Guide**.
  - Clean, card-based UI with article previews, images, and trusted source logos.

- **📰 Medical News**
  - Fetches and displays the **latest medical updates** from reliable outlets.

- **📅 Appointment Management**
  - Sidebar shows upcoming appointments.
  - Appointments are persistent and reload automatically on startup.

- **🔐 Authentication**
  - Secure login with a branded MedLink logo and custom background.

- **🎨 Custom UI**
  - Branded background images for main content areas.
  - Fully responsive layout with header, footer, and side panels unaffected by background visuals.

---

## 🛠 Tech Stack

- **Frontend:** React, Reactstrap, Context API, Custom CSS  
- **Backend:** Node.js, Express, Cheerio, node-fetch  
- **Assets:** SVG/PNG images for branding and article sources  

---

## 📂 Project Structure

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

---

## 🚀 Getting Started

1. **Clone the repository**
   ```sh
   git clone <repo-url>
   cd MedLink
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Run the backend server**
   ```sh
   node api-server.js
   ```

4. **Start the frontend (new terminal)**
   ```sh
   npm start
   ```

5. **Open the app**
   - Visit [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 📡 API Endpoints

- `/api/featured-health` → Featured WHO article (JSON)  
- `/api/featured-food` → Featured Canada Food Guide article (JSON)  
- Additional endpoints for medical news & appointments  

---

## 🎛 Customization

- **Background Image** → Replace `MedLink_Background.png` in `src/assets/`  
- **Logos** → Update `logo.svg`, `who-logo.png`, or `gov-can-logo.png` in `src/assets/`  

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to improve.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
