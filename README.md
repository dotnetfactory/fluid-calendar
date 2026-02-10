# FluidCalendar

An open-source alternative to Motion, designed for intelligent task scheduling and calendar management. FluidCalendar helps you stay on top of your tasks with smart scheduling capabilities, calendar integration, and customizable workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

⚠️ **WARNING: ACTIVE DEVELOPMENT VERY BUGGY - REPORT BUGS AND BE PATIENT ✌️** ⚠️

This project is in active development and currently contains many bugs and incomplete features. It is not yet recommended for production use. If you encounter issues:

1. Please check the [existing issues](https://github.com/dotnetfactory/fluid-calendar/issues) to see if it's already reported
2. If not found, [create a new issue](https://github.com/dotnetfactory/fluid-calendar/issues/new) with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Any relevant error messages or screenshots

Your bug reports help make FluidCalendar better! We appreciate your patience and contributions as we work to stabilize the platform.

## About

FluidCalendar is built for people who want full control over their scheduling workflow. It combines the power of automatic task scheduling with the flexibility of open-source software. Read more about the journey and motivation in [Part 1 of my blog series](https://medium.com/front-end-weekly/fluid-calendar-an-open-source-alternative-to-motion-part-1-7a5b52bf219d).

![Snagit 2024 2025-02-16 12 33 23](https://github.com/user-attachments/assets/515381e9-b961-475d-a272-d454ecca59cb)

## Support the Project ❤️

If you find FluidCalendar useful, please consider supporting its development. Your sponsorship helps ensure continued maintenance and new features.

[![GitHub Sponsor](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa.svg?style=for-the-badge&logo=github)](https://github.com/sponsors/eibrahim)

By becoming a sponsor, you:

- Help keep the project actively maintained
- Get early access to new features
- Support open-source software development

## Sponsored By                                                                                     
                                                                                                  
<a href="https://www.nitroclaw.com?ref=fluid-calendar">                                             

   <img width="600" alt="NitroClaw - Your Own OpenClaw Assistant, Zero Server Hassle" src="https://github.com/user-attachments/assets/c258d98c-b06b-4580-82b0-e54281613e54" />

</a>

**[NitroClaw](https://www.nitroclaw.com?ref=fluid-calendar)** - Your Own OpenClaw Assistant, Zero
Server Hassle

Deploy a dedicated OpenClaw AI assistant in under 2 minutes. Pick your LLM, connect Telegram, and
start chatting - we handle all the infrastructure. $100/month with $50 in AI credits included.

[Get Started](https://www.nitroclaw.com?ref=fluid-calendar)

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

To enable Google Calendar integration:

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
     - `./auth/calendar`
     - `./auth/userinfo.email`
     - `openid`
     - `/auth/tasks` _(Required if you plan to sync Google Tasks)_
   - Add test users if in testing mode

4. Create OAuth 2.0 Credentials:

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Set Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production URL (if deployed)
   - Set Authorized redirect URIs:
     - `http://localhost:3000/api/calendar/google` (for development)
     - `https://your-domain.com/api/calendar/google` (for production)
   - Click "Create"
   - Save the generated Client ID and Client Secret

5. Configure Credentials:
   - Go to FluidCalendar Settings > System
   - Enter your Google Client ID and Client Secret in the Google Calendar Integration section
   - Or set environment variables as fallback:
     ```bash
     GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
     GOOGLE_CLIENT_SECRET="your-client-secret"
     ```

Note: For production deployment, you'll need to:

- Verify your domain ownership
- Submit your application for verification if you plan to have more than 100 users
- Add your production domain to the authorized origins and redirect URIs

## Microsoft Outlook Setup

To enable Outlook Calendar integration:

1. Create an Azure AD Application:

   - Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   - Click "New registration"
   - Name your application (e.g., "FluidCalendar")
   - Under "Supported account types", select "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"
   - Click "Register"

2. Configure Platform Settings:

   - In your registered app, go to "Authentication"
   - Click "Add a platform"
   - Choose "Web"
   - Add Redirect URIs:
     - `http://localhost:3000/api/auth/callback/azure-ad` (for development)
     - `https://your-domain.com/api/auth/callback/azure-ad` (for production)
   - Under "Implicit grant", check "Access tokens" and "ID tokens"
   - Click "Configure"

3. Add API Permissions:

   - Go to "API permissions"
   - Click "Add a permission"
   - Choose "Microsoft Graph"
   - Select "Delegated permissions"
   - Add the following permissions:
     - `Calendars.ReadWrite`
     - `Tasks.ReadWrite`
     - `User.Read`
     - `offline_access`
   - Click "Add permissions"
   - Click "Grant admin consent" (if you're an admin)

4. Create Client Secret:

   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Add a description and choose expiry
   - Click "Add"
   - Copy the generated secret value immediately (you won't be able to see it again)

5. Configure Credentials:
   - Go to FluidCalendar Settings > System
   - Enter your Outlook credentials in the Outlook Calendar Integration section:
     - Client ID (Application ID)
     - Client Secret
     - Tenant ID (Optional - leave empty to allow any Microsoft account)
   - Or set environment variables as fallback:
     ```bash
     AZURE_AD_CLIENT_ID="your-client-id"
     AZURE_AD_CLIENT_SECRET="your-client-secret"
     AZURE_AD_TENANT_ID="your-tenant-id-or-common"
     ```

Note: For production deployment:

- Update the redirect URIs to include your production domain
- Ensure all required permissions are granted
- Consider implementing additional security measures based on your needs

## Installation

### Quick Start with Docker (Recommended)

1. Install Docker on your machine
2. Clone the repository (or just download the docker-compose.yml file):

   ```bash
   git clone https://github.com/dotnetfactory/fluid-calendar.git
   cd fluid-calendar
   ```

3. Copy the example environment file and configure it:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and set at minimum these values:

   ```
   DATABASE_URL=postgresql://fluid:fluid@db:5432/fluid_calendar
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret-key
   ```

4. Run the application:

   ```bash
   docker compose up -d
   ```

5. Visit http://localhost:3000

That's it! The application will be running with a PostgreSQL database automatically configured. The docker-compose.yml file is already configured to use the pre-built Docker image.

### For Developers

If you want to develop FluidCalendar:

1. Clone the repository:

   ```bash
   git clone https://github.com/dotnetfactory/fluid-calendar.git
   cd fluid-calendar
   ```

2. Start the development environment:

   ```bash
   docker compose -f docker-compose.yml up -d
   ```

3. Visit http://localhost:3000

The development environment includes:

- Hot reloading
- PostgreSQL database
- Development tools
- Exposed database port (5432) for direct access

### Useful Docker Commands

```bash
# View logs
docker compose logs -f

# Stop the application
docker compose down

# Update to the latest version
docker pull eibrahim/fluid-calendar:latest
docker compose up -d

# Reset database (caution: deletes all data)
docker compose down -v
docker compose up -d

# Access database CLI
docker compose exec db psql -U fluid -d fluid_calendar
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

## SAAS Development

FluidCalendar is available as both an open source self-hosted solution and a managed SAAS service. The open source version contains all the core functionality, while the SAAS version includes additional premium features.

### Open Source vs SAAS Features

| Feature                           | Open Source | SAAS |
| --------------------------------- | ----------- | ---- |
| Calendar Management               | ✅          | ✅   |
| Task Management                   | ✅          | ✅   |
| Google Calendar Integration       | ✅          | ✅   |
| Outlook Calendar Integration      | ✅          | ✅   |
| CalDAV Integration                | ✅          | ✅   |
| Billing & Subscription Management | ❌          | ✅   |

### SAAS Development Setup

If you're a contributor to the SAAS version, follow these steps to set up your development environment:

1. Clone the private SAAS repository:

   ```
   git clone https://github.com/dotnetfactory/fluid-calendar-saas.git
   ```

2. Enable SAAS features in your environment:

   ```
   # .env.local
   ENABLE_SAAS_FEATURES=true
   ```

3. Run the development server:
   ```
   npm run dev
   ```

### Syncing Changes Between Repositories

To sync changes from the private SAAS repository to the public open source repository:

1. Use the provided sync script:

   ```
   ./scripts/sync-repos.sh /path/to/private/repo /path/to/public/repo
   ```

2. Review the changes in the public repository
3. Commit and push the changes to the public repository

### Contributing to SAAS Features

When developing SAAS features:

1. Place all SAAS-specific code in the `src/saas` directory
2. Use the feature flag system to conditionally enable SAAS features
3. Provide fallbacks for SAAS features in the open source version

For more information about contributing to the SAAS version, please contact the maintainers.
