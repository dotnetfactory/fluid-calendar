# Contributing to FluidCalendar

Thank you for your interest in contributing to FluidCalendar! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use Docker)
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/fluid-calendar.git
   cd fluid-calendar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the database**
   ```bash
   npm run db:up
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open http://localhost:3000**

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Your environment (OS, browser, Node.js version)

### Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been requested
- Provide a clear description of the feature
- Explain why this feature would be useful
- Include mockups or examples if possible

### Pull Requests

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Write meaningful commit messages
   - Add tests if applicable

3. **Run checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test:unit
   ```

4. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Messages

We follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: add dark mode toggle to settings
fix: resolve calendar sync issue with Google Calendar
docs: update installation instructions
```

## Project Structure

```
fluid-calendar/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (common)/     # Core routes (calendar, tasks, settings)
│   │   └── api/          # API routes
│   ├── components/       # React components
│   ├── lib/              # Utilities and services
│   └── store/            # Zustand state management
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── docs/                 # Documentation
```

## Code Style

- We use ESLint and Prettier for code formatting
- TypeScript is required for all new code
- Follow React best practices and hooks guidelines
- Use meaningful variable and function names

### Running Linters

```bash
# Check for lint errors
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Testing

```bash
# Run unit tests
npm run test:unit

# Run e2e tests
npm run test:e2e
```

## Architecture Notes

### Feature Flags

FluidCalendar supports both open-source and hosted versions via feature flags:
- `NEXT_PUBLIC_ENABLE_SAAS_FEATURES` - Enables SaaS-specific features
- Files with `.open.` extension are open-source only
- The core functionality works without any SaaS features

### Database

- We use Prisma ORM with PostgreSQL
- All models include `userId` for multi-tenant isolation
- Run `npx prisma studio` to inspect the database

### State Management

- Zustand for client-side state
- React Query for server state
- Stores are organized by domain (tasks, calendar, settings)

## Getting Help

- Check the [documentation](docs/)
- Open a [GitHub Discussion](https://github.com/dotnetfactory/fluid-calendar/discussions)
- Join our community (link TBD)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
