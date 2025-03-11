# Agentic Browser

An intelligent browser agent that analyzes user browsing history to discover patterns, generate insights, and suggest actionable goals.

## What It Does

Agentic Browser is designed to help users accomplish tasks by understanding their browsing patterns and intentions. The application follows this workflow:

1. **History Collection** - Gathers user browsing history from Chrome
2. **Clustering** - Creates clusters of URLs using rich embedding representations
3. **Analysis** - Analyzes clusters to give them meaningful names and descriptions
4. **Goal Generation** - Creates actionable goals from these clusters
5. **Task Accomplishment** - Presents goals to users and offers tools to accomplish them

When a user clicks the "magic button," the agent can automatically accomplish the selected goal!

## Application Workflow

```mermaid
graph TD
    A[User Browser History] -->|Collect history data| B[History Collection]
    B -->|Process URLs| C[Embedding Generation]
    C -->|Create vector representations| D[URL Clustering]
    D -->|Group similar URLs| E[Cluster Analysis]
    E -->|Name & describe clusters| F[Goal Generation]
    F -->|Create actionable tasks| G[Present to User]
    G -->|User selects goal| H[Agent Execution]
    H -->|Complete task| I[Goal Accomplished]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style I fill:#9f9,stroke:#333,stroke-width:2px
```

## API Routes

The application exposes several API endpoints:

| Route | Method | Description |
|-------|--------|-------------|
| `/api/history` | GET | Fetches user's Chrome browsing history |
| `/api/cluster` | POST | Creates clusters from URLs using embedding-based clustering |
| `/api/cluster-goals` | POST | Generates actionable goals from clusters |
| `/api/agent` | POST | Executes actions to accomplish selected goals |

## Technology Stack

### Frontend
- **Next.js** - React framework for the user interface
- **Tailwind CSS** - Utility-first CSS framework for styling

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **better-sqlite3** - SQLite database access for Chrome history
- **OpenAI API** - Used for:
  - Text embeddings (text-embedding-3-small model)
  - Content analysis and clustering (GPT-4o model)
  - Goal generation (GPT-4o model)

### Algorithms
- **DBScan** - Density-based clustering algorithm
- **Euclidean Distance** - Vector similarity measurement

### Third-party Services
- **Composio-core** - Tool creation framework
- **Firecrawl** - Web crawling capabilities (when needed)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm package manager
- Chrome browser installed (for history access)
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agentic-browser.git
cd agentic-browser
```

2. Install dependencies:
```bash
pnpm install
```

3. Create an `.env.local` file with your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:
```bash
pnpm dev
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. Visit the main page to see a dashboard of your browsing patterns
2. The application will automatically cluster your browsing history
3. Review the generated goals for each cluster
4. Select a goal you'd like to accomplish
5. Click the "magic button" to let the agent complete the task for you

## Database Setup & Migrations

To use this new caching implementation, you'll need a PostgreSQL database:

1. Check your PostgreSQL installation and user:
```bash
# List your databases and check your username
psql -U postgres -d postgres
\l
```
Your username will be shown as the "Owner" of the databases.

2. Create a PostgreSQL database:
```bash
createdb agentic_browser_dev
```

3. Copy .env.example to .env and configure your DATABASE_URL:
```bash
cp .env.example .env
```

4. Update your DATABASE_URL in .env:
```
# If you have a password set:
DATABASE_URL=postgres://username:password@localhost:5432/agentic_browser_dev

# If using trust authentication (no password):
DATABASE_URL=postgres://username@localhost:5432/agentic_browser_dev
```
Replace 'username' with your PostgreSQL username (found in step 1).

5. Run migrations:
```bash
pnpm migrate:dev
```

If you encounter authentication issues:
- Check if you're using the correct username from `psql \l`
- If using a password, verify it's correct
- For local development, you might need to edit pg_hba.conf to use "trust" authentication

## License

This project is licensed under the MIT License - see the LICENSE file for details.
