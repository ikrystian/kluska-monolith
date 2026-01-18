# Kluska Monolith

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=flat-square&logo=tailwind-css)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A comprehensive web application built with Next.js, designed to manage various aspects of business operations including projects, tasks, and user management.

## ✨ Features

- 📊 **Project Management** - Track projects with tasks, milestones, and team assignments
- 👥 **User Management** - Role-based access control with admin panel
- 📅 **Calendar Integration** - Schedule and manage events with FullCalendar
- 🤖 **AI Integration** - Powered by Google Genkit for intelligent features
- 🗺️ **Maps Integration** - Location-based features with Google Maps
- 📱 **Responsive Design** - Mobile-first approach with Tailwind CSS
- 🔐 **Authentication** - Secure authentication with NextAuth.js

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [MongoDB](https://www.mongodb.com/)
- **ORM:** [Mongoose](https://mongoosejs.com/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **AI Integration:** [Genkit](https://firebase.google.com/docs/genkit)
- **UI Components:** [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Forms:** [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Calendar:** [FullCalendar](https://fullcalendar.io/)
- **Maps:** [Google Maps API](https://developers.google.com/maps)

## Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- [npm](https://www.npmjs.com/) (Comes with Node.js)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or Atlas connection)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ikrystian/kluska-monolith.git
    cd kluska-monolith
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory. You can use `.env.example` as a template if available, or populate it with the necessary keys (Database URL, NextAuth Secret, API keys, etc.).
    
    Example structure:
    ```env
    DATABASE_URL="mongodb://localhost:27017/kluska-monolith"
    NEXTAUTH_SECRET="your-super-secret-key"
    NEXTAUTH_URL="http://localhost:3000"
    # Add other necessary keys
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev`: Starts the development server with Turbopack.
- `npm run build`: Builds the application for production.
- `npm start`: Starts the production server.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run typecheck`: Runs TypeScript type checking.

## Project Structure

- `src/app`: App Router pages and layouts.
- `src/components`: Reusable UI components.
- `src/lib`: Utility functions and library configurations.
- `src/models`: Mongoose data models.
- `src/hooks`: Custom React hooks.
- `src/contexts`: React context providers.
- `src/ai`: AI-related functionality and Genkit integration.
- `src/types`: TypeScript type definitions.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

For questions or support, please open an issue in this repository.