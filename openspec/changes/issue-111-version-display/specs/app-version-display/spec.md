## ADDED Requirements

### Requirement: Display the application version on every page

The application SHALL display its version number on every page of the authenticated app. The displayed version MUST reflect the version declared in `package.json` without requiring a separate manual update. When the version is unavailable at runtime, the UI MUST display a sane fallback value rather than an empty or `undefined` version.

#### Scenario: Version is shown on an authenticated page

- **WHEN** a user views any authenticated page (e.g. Calendar, Tasks, Focus, Settings)
- **THEN** the application version is visible (e.g. in a footer)

#### Scenario: Displayed version tracks package.json

- **WHEN** the `package.json` version is `X.Y.Z`
- **AND** the application is built
- **THEN** the version shown in the UI is `X.Y.Z`

#### Scenario: Fallback when the version is unavailable

- **WHEN** the version value is missing or empty at runtime
- **THEN** the UI shows a fallback version string instead of an empty or `undefined` value

### Requirement: Version links to the project's GitHub page

The displayed version SHALL be a link that, when clicked, takes the user to the project's GitHub page. The link MUST open the external GitHub destination (in a new browser tab/window with safe `rel` attributes).

#### Scenario: Clicking the version opens GitHub

- **WHEN** a user clicks the displayed version
- **THEN** the project's GitHub page opens in a new tab

#### Scenario: Link target for a known released version

- **WHEN** the displayed version corresponds to a real released version
- **THEN** the link points to that version's GitHub release tag page

#### Scenario: Link target when the version is the fallback

- **WHEN** the displayed version is the fallback/unknown value
- **THEN** the link points to the project's GitHub repository root
