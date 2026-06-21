# app-version-display Specification

## Purpose
TBD - created by archiving change issue-111-version-display. Update Purpose after archive.
## Requirements
### Requirement: Display the application version on every page

The application SHALL display its version number on every page, including the authenticated app pages and the public open-source homepage. The displayed version MUST reflect the version declared in `package.json` without requiring a separate manual update. When the version is unavailable at runtime, the UI MUST display a sane fallback value rather than an empty or `undefined` version.

#### Scenario: Version is shown on an authenticated page

- **WHEN** a user views any authenticated page (e.g. Calendar, Tasks, Focus, Settings)
- **THEN** the application version is visible (e.g. in a footer)

#### Scenario: Version is shown on the public homepage

- **WHEN** a user views the public open-source homepage (`/`)
- **THEN** the application version is visible in the page footer

#### Scenario: Version is shown on the failure pages

- **WHEN** a user reaches the root 404 (not-found) page or the root error page
- **THEN** the application version is visible on that page

#### Scenario: Displayed version tracks package.json

- **WHEN** the `package.json` version is `X.Y.Z`
- **AND** the application is built
- **THEN** the version shown in the UI is `X.Y.Z`

#### Scenario: Fallback when the version is unavailable

- **WHEN** the version value is missing or empty at runtime
- **THEN** the UI shows a fallback version string instead of an empty or `undefined` value

### Requirement: Version links to the project's GitHub page

The displayed version SHALL be a link that, when clicked, takes the user to the project's GitHub page. The link target MUST always resolve to a valid GitHub page (the repository root), regardless of the displayed version, so it never points at a nonexistent release. The link MUST open the external GitHub destination (in a new browser tab/window with safe `rel` attributes).

#### Scenario: Clicking the version opens GitHub

- **WHEN** a user clicks the displayed version
- **THEN** the project's GitHub repository page opens in a new tab

#### Scenario: Link target is valid for any version

- **WHEN** the displayed version is any value (a released version, an unreleased version with no tag, or the fallback)
- **THEN** the link points to the project's GitHub repository root, which always exists

