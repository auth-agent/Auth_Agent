# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-28

### Added
- Initial release of @auth-agent/better-auth-plugin
- Server plugin with OAuth 2.1 endpoints
- Client plugin with React hooks
- AuthAgentButton React component
- useAuthAgent headless hook
- Full TypeScript support with type inference
- PKCE implementation for secure OAuth flow
- Rate limiting on authentication endpoints
- Custom user mapping support
- Success callback hooks
- Comprehensive documentation
- Next.js example application

### Security
- PKCE (Proof Key for Code Exchange) implementation
- State parameter validation for CSRF protection
- Secure token storage (server-side only)
- Rate limiting to prevent abuse
- HTTPS enforcement for production redirects
