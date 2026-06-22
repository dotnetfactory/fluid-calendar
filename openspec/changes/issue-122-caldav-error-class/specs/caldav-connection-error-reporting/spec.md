## ADDED Requirements

### Requirement: CalDAV login failures are classified as connection or authentication errors

The system SHALL classify a failed CalDAV login (in the "test", "connect", and "list available calendars" flows) as either a connection error or an authentication error and report it with a matching user-facing message and HTTP status. The classification rules are:

- A network-layer failure - the connection could not be established (DNS
  resolution failure, connection refused/reset, timeout, host/network
  unreachable) or the server's TLS certificate could not be verified
  (self-signed or otherwise untrusted) - SHALL be reported as a **connection
  error** with a message that directs the user to check the server URL, their
  network/firewall, and the server's TLS certificate, and SHALL use an HTTP
  status distinct from the authentication status (a `5xx` gateway status).
- A genuine credentials rejection (the server responded with HTTP 401 /
  "invalid credentials") SHALL be reported as an **authentication error** with a
  message directing the user to check their credentials, and SHALL use HTTP
  status `401`.
- An error that cannot be positively identified as a connection failure SHALL
  default to the authentication classification, so the response is never less
  informative than reporting an authentication failure.

In all cases the response SHALL preserve the original error text in a `details`
field and SHALL keep the existing JSON response shape (`error`, `details`, and
the route's existing `success` flag where present) so the existing UI renders it
without change.

#### Scenario: Self-signed / unreachable server is reported as a connection error

- **WHEN** a CalDAV login fails with a `fetch failed` error (e.g. a self-signed
  TLS certificate producing `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, or a DNS failure
  producing `ENOTFOUND`)
- **THEN** the classifier returns `kind: "connection"`
- **AND** the user-facing message refers to the connection / server URL / TLS
  certificate and not to credentials
- **AND** the HTTP status is a `5xx` gateway status (`502`)

#### Scenario: Wrong credentials are still reported as an authentication error

- **WHEN** a CalDAV login fails with an `Invalid credentials` error (the server
  returned HTTP 401)
- **THEN** the classifier returns `kind: "auth"`
- **AND** the user-facing message asks the user to check their credentials
- **AND** the HTTP status is `401`

#### Scenario: Unknown error defaults to authentication

- **WHEN** a CalDAV login fails with an error that matches no known
  connection/TLS signature
- **THEN** the classifier returns `kind: "auth"` with the credentials message
  and HTTP status `401`

#### Scenario: Every CalDAV login route uses the classification

- **WHEN** any CalDAV route that performs a login (test, connect, list available
  calendars, or add a selected calendar) catches a login failure
- **THEN** it returns the classified message and status from the shared
  classifier
- **AND** it includes the original error text in the `details` field

#### Scenario: A post-login connection failure is also classified

- **WHEN** login succeeds but a subsequent CalDAV network operation in the same
  request (calendar discovery or path verification during test, calendar
  discovery during list-available or add-calendar, or path validation during
  connect) fails with a connection/TLS error
- **THEN** the route reports it as a connection error (the connection message +
  a `5xx` gateway status) rather than a generic 500 or a bad-path error
- **AND** the connection classification is scoped to the CalDAV network call, so
  a failure from non-CalDAV work in the same handler (e.g. a database query)
  keeps the route's existing generic error and status and is not mislabeled as a
  CalDAV connection failure

#### Scenario: The available-calendars list surfaces the classified error

- **WHEN** the available-calendars list view receives a non-OK response from the
  available-calendars endpoint
- **THEN** it shows the server-provided error message (the classified
  connection-or-auth message) rather than a generic "no calendars" empty state
