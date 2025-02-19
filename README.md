# FluidCalendar

An open-source alternative to Motion, designed for intelligent task scheduling and calendar management. FluidCalendar helps you stay on top of your tasks with smart scheduling capabilities, calendar integration, and customizable workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

⚠️ **WARNING: ACTIVE DEVELOPMENT** ⚠️

This project is in active development and currently contains many bugs and incomplete features. It is not yet recommended for production use. If you encounter issues:

1. Please check the [existing issues](https://github.com/fluidcalendar/fluidcalendar/issues) to see if it's already reported
2. If not found, [create a new issue](https://github.com/fluidcalendar/fluidcalendar/issues/new) with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Any relevant error messages or screenshots

Your bug reports help make FluidCalendar better! We appreciate your patience and contributions as we work to stabilize the platform.

## About

FluidCalendar is built for people who want full control over their scheduling workflow. It combines the power of automatic task scheduling with the flexibility of open-source software. Read more about the journey and motivation in [Part 1 of my blog series](https://medium.com/front-end-weekly/fluid-calendar-an-open-source-alternative-to-motion-part-1-7a5b52bf219d).

![Snagit 2024 2025-02-16 12 33 23](https://github.com/user-attachments/assets/515381e9-b961-475d-a272-d454ecca59cb)


## Try the SaaS Version

Don't want to self-host? We're currently beta testing our hosted version at [FluidCalendar.com](https://fluidcalendar.com). Sign up for the waitlist to be among the first to experience the future of intelligent calendar management, with all the features of the open-source version plus:

- Managed infrastructure
- Automatic updates
- Premium support
- Advanced AI features

## Features

- 🤖 **Intelligent Task Scheduling** - Automatically schedule tasks based on your preferences and availability
- 📅 **Calendar Integration** - Seamless sync with Google Calendar (more providers coming soon)
- ⚡ **Smart Time Slot Management** - Finds optimal time slots based on your work hours and buffer preferences
- 🎨 **Modern UI** - Clean, responsive interface with smooth transitions
- 🔧 **Customizable** - Adjust scheduling algorithms and preferences to your needs
- 🔒 **Privacy-Focused** - Self-host your own instance

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Prisma for database management
- FullCalendar for calendar UI
- NextAuth.js for authentication
- Tailwind CSS for styling

## Prerequisites

- Node.js (version specified in `.nvmrc`)
- A Google Cloud Project (for Google Calendar integration)

## Google Cloud Setup

To enable Google Calendar integration, you'll need to set up a Google Cloud Project:

1. Create a Project:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Click "New Project" and follow the prompts
   - Note your Project ID

2. Enable Required APIs:
   - In your project, go to "APIs & Services" > "Library"
   - Search for and enable:
     - Google Calendar API
     - Google People API (for user profile information)

3. Configure OAuth Consent Screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in the required information:
     - App name: "FluidCalendar" (or your preferred name)
     - User support email
     - Developer contact information
   - Add scopes:
     - `./auth/calendar.events`
     - `./auth/calendar.readonly`
     - `./auth/userinfo.email`
     - `./auth/userinfo.profile`
   - Add test users if in testing mode

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Set Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production URL (if deployed)
   - Set Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://your-domain.com/api/auth/callback/google` (for production)
   - Click "Create"
   - Save the generated Client ID and Client Secret

5. Update Environment Variables:
   ```bash
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

Note: For production deployment, you'll need to:
- Verify your domain ownership
- Submit your application for verification if you plan to have more than 100 users
- Add your production domain to the authorized origins and redirect URIs

## Installation

### Option 1: Docker Image (Recommended)

The easiest way to run FluidCalendar is using our official Docker image:

```bash
# Pull the latest image
docker pull eibrahim/fluid-calendar:latest

# Create data directory for persistent storage
mkdir -p data

# Create a .env file
cat > .env << EOL
DATABASE_URL=file:/app/data/dev.db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
EOL

# Stop and remove existing container if it exists
docker stop fluid-calendar || true
docker rm fluid-calendar || true

# Run database migrations
docker run --rm \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  eibrahim/fluid-calendar:latest \
  npx prisma migrate deploy

# Run the application
docker run -d \
  --name fluid-calendar \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  eibrahim/fluid-calendar:latest

# View logs (optional)
docker logs -f fluid-calendar
```

After starting the container, visit http://localhost:3000/settings and configure your Google credentials and logging preferences in the System Settings tab.

#### Useful Docker Commands:
```bash
# Stop the container
docker stop fluid-calendar

# Start an existing container
docker start fluid-calendar

# Remove the container
docker rm fluid-calendar

# View logs
docker logs -f fluid-calendar

# Check container status
docker ps -a | grep fluid-calendar

# Reset database (if needed)
rm -rf data/* && docker run --rm \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  eibrahim/fluid-calendar:latest \
  npx prisma migrate deploy
```

Available tags:
- `latest` - Latest stable release
- `dev` - Development version
- `v*.*.*` - Specific versions (e.g., v1.0.0)

For production deployments, we recommend using specific version tags.

### Option 2: Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fluid-calendar.git
cd fluid-calendar
```

2. Setup the project (installs dependencies and sets up database):
```bash
npm run setup
```

3. Start the development server:
```bash
npm run dev
```

#### Useful Local Development Commands:
```bash
# Start Prisma Studio (database GUI)
npm run prisma:studio

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Clean the project (remove node_modules and .next)
npm run clean
```

### Option 3: Docker Development

We provide a Docker setup for easy development. This is the recommended way to get started.

1. Prerequisites:
   - Docker and Docker Compose installed on your machine
   - Git for cloning the repository

2. Clone and start the application:
```bash
# Clone the repository
git clone https://github.com/yourusername/fluid-calendar.git
cd fluid-calendar

# Copy environment file
cp .env.example .env

# Start the application with hot reloading
npm run docker:dev
```

The application will be available at http://localhost:3000

#### Docker Development Features:
- 🔄 Hot reloading enabled
- 💾 Persistent database storage
- 🛠️ Automatic Prisma migrations
- 🔒 Secure default configuration

#### Useful Docker Commands:
```bash
# Start the application
npm run docker:dev

# Rebuild and start
npm run docker:dev:build

# Stop the application
npm run docker:dev:down

# View logs
npm run docker:logs

# Clean up volumes and containers
npm run docker:clean
```

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure the following environment variables:
- `DATABASE_URL`: Your database connection string
- `NEXTAUTH_URL`: Your application URL
- `NEXTAUTH_SECRET`: Random string for session encryption

3. Optional environment variables (can be configured in System Settings instead):
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `LOG_LEVEL`: Logging level (none/debug)

Note: Google credentials and logging settings can be managed through the UI in Settings > System. Environment variables will be used as fallback if system settings are not configured.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Need Professional Help?

Don't want to handle the migration yourself? We offer a complete done-for-you service that includes:

- Managed OpenProject hosting
- Complete Jira migration
- 24/7 technical support
- Secure and reliable infrastructure

Visit [portfolio.elitecoders.co/openproject](https://portfolio.elitecoders.co/openproject) to learn more about our managed OpenProject migration service.

## About

This project was built by [EliteCoders](https://www.elitecoders.co), a software development company specializing in custom software solutions. If you need help with:

- Custom software development
- System integration
- Migration tools and services
- Technical consulting

Please reach out to us at hello@elitecoders.co or visit our website at [www.elitecoders.co](https://www.elitecoders.co).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
