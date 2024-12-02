# bluesky MCP Server

A Model Context Protocol server

This is a TypeScript-based MCP server that implements a simple notes system. It demonstrates core MCP concepts by providing:

- Resources representing text notes with URIs and metadata
- Tools for creating new notes
- Prompts for generating summaries of notes

## Tools

### `bluesky_get_user_profile`

- **Description**: Get detailed profile information for a specific Bluesky user.
- **Inputs**:
  - `handle` (string): The handle of the user (e.g., `username.bsky.social`).
- **Returns**: A JSON object containing detailed information about the user's profile, such as their display name, bio, and other metadata.

### `bluesky_get_user_posts`

- **Description**: Get recent posts from a specific Bluesky user.
- **Inputs**:
  - `handle` (string): The handle of the user (e.g., `username.bsky.social`).
  - `limit` (number, optional): Number of posts to retrieve (default 10, max 100).
- **Returns**: A list of recent posts, including post content, creation timestamp, and associated metadata.

### `bluesky_create_record`

- **Description**: Create a new post in the specified Bluesky repo and collection.
- **Inputs**:
  - `repo` (string): The handle or DID of the repo (e.g., `username.bsky.social`).
  - `collection` (string): The NSID of the record collection.
  - `record` (object): The data for the new record.
  - `rkey` (string, optional): The Record Key.
  - `validate` (boolean, optional): Set to `false` to skip schema validation (default `true`).
  - `swapCommit` (string, optional): The CID of the previous commit for conflict resolution.
- **Returns**: A JSON object containing details of the newly created record, including its URI and CID.

### `bluesky_get_timeline`

- **Description**: Get a view of the requesting account's home timeline.
- **Inputs**:
  - `algorithm` (string, optional): Variant 'algorithm' for timeline (implementation-specific).
  - `limit` (number, optional): Maximum number of items to retrieve (default 50, max 100).
  - `cursor` (string, optional): Pagination cursor for fetching the next page of results.
- **Returns**: A JSON object containing a list of timeline posts, including post content and metadata.

### `bluesky_search_posts`

- **Description**: Find posts matching search criteria.
- **Inputs**:
  - `q` (string): Search query string.
  - `sort` (string, optional): Ranking order of results (`"top"` or `"latest"`, default `"latest"`).
  - `since` (string, optional): Filter results for posts after the specified datetime.
  - `until` (string, optional): Filter results for posts before the specified datetime.
  - `mentions` (string, optional): Filter posts mentioning the given account.
  - `author` (string, optional): Filter posts by the given account.
  - `lang` (string, optional): Filter posts by language.
  - `domain` (string, optional): Filter posts linking to the given domain.
  - `url` (string, optional): Filter posts pointing to this URL.
  - `tag` (array of strings, optional): Filter posts with the given tags.
  - `limit` (number, optional): Maximum number of items to retrieve (default 10, max 100).
  - `cursor` (string, optional): Pagination cursor for fetching the next page of results.
- **Returns**: A JSON object containing a list of posts that match the search criteria, including content, metadata, and pagination details.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Setup

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bluesky": {
      "command": "node",
      "args": [
        "/path/to/bluesky/dist/index.js"
      ],
      "env": {
        "PDS_HOST": "https://path/to/blsky",
        "BSKY_HANDLE": "your-handle-name",
        "BSKY_PASSWORD": "your-app-password"
      }
    }
  }
}
```

### Environment Variables:

- **"PDS_HOST"**:
  - "PDS_HOST" is your PDS host (including `https://`).
  - By default, it is `"https://bsky.social"`.

- **"BSKY_HANDLE"**:
  - "BSKY_HANDLE" is the user ID you want to authenticate. The user ID is the string starting with `@` that appears when you open your profile.

- **"BSKY_PASSWORD"**:
  - "BSKY_PASSWORD" is the password for the user ID or an App Password. Bluesky strongly recommends using an App Password instead of the main account password. For instructions on how to set up an App Password, see [here](https://blueskyfeeds.com/en/faq-app-password).

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
