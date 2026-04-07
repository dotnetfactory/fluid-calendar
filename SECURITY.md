# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | Yes                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email us at: dev@fluidcalendar.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on our progress
- Credit in our security advisories (if desired)

### Scope

In scope:
- Authentication and authorization issues
- Data exposure vulnerabilities
- Injection vulnerabilities (SQL, XSS, etc.)
- Server-side vulnerabilities

Out of scope:
- Denial of service attacks
- Social engineering
- Physical security

## Security Best Practices for Self-Hosting

1. **Environment Variables**: Never commit `.env` files with real credentials
2. **Database**: Use strong passwords and restrict network access
3. **HTTPS**: Always use HTTPS in production
4. **Updates**: Keep dependencies updated regularly
5. **Backups**: Maintain regular database backups

## Disclosure Policy

We follow responsible disclosure. We will:
- Work with you to understand and resolve the issue
- Keep you informed of our progress
- Credit you (unless you prefer anonymity)
- Not take legal action against good-faith security research
