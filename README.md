# Winston - Web3 AI Security Auditor

Winston is an AI-powered security auditing tool designed for Web3 and smart contract code, leveraging Claude 3.7's advanced capabilities for comprehensive security analysis.

## Features

🔍 **Code Diagramming**: Generate visual representations of your smart contracts, including inheritance, function relationships, and control flow.

🧠 **Business Logic Analysis**: In-depth examination of contract functionality to identify potential security weaknesses and vulnerabilities.

🔒 **Semgrep Rule Generation**: Create custom Semgrep rules tailored to your codebase for ongoing security scanning.

🔐 **Static Security Analysis**: Perform code analysis to identify common smart contract vulnerabilities without requiring an API key.

🔎 **Function Explainer**: Generate detailed explanations of each function and trace logic vulnerabilities across function boundaries.

✨ **Multi-file Support**: Analyze entire directories or git repositories with a single command.

## Installation

### Standard Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/winston.git
cd winston

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env file with your Anthropic API key
nano .env
```

### Docker Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/winston.git
cd winston

# Create .env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=your_anthropic_api_key_here" > .env

# Build and run with Docker Compose
npm run docker-build
npm run docker-up
```

## Environment Setup

You need an Anthropic API key to use Winston. Create a `.env` file in the project root with the following content:

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Usage

### CLI Usage

```bash
# Audit a single smart contract
npm run audit path/to/your/contract.sol

# Audit an entire directory of contracts
npm run audit path/to/your/contracts/directory/

# Audit a git repository (automatically detected for most git URLs)
npm run audit https://github.com/username/smart-contract-repo.git

# Audit a contract from a direct URL (automatically downloads file)
npm run audit https://example.com/path/to/Contract.sol

# Force treating a URL as a git repository
npm run audit -- https://github.com/username/repo-without-dotgit --git

# Analyze specific aspects only
npm run audit -- path/to/your/contract.sol --diagram
npm run audit -- path/to/your/contract.sol --analysis
npm run audit -- path/to/your/contract.sol --semgrep
npm run audit -- path/to/your/contract.sol --static
npm run audit -- path/to/your/contract.sol --explain

# Specify custom output directory
npm run audit -- path/to/your/contract.sol --output ./my-audit-results
```

### Docker Usage

```bash
# Run with default sample contract
npm run docker-audit

# Audit a specific contract
docker-compose run --rm winston audit /app/contracts/YourContract.sol

# Audit an entire directory
docker-compose run --rm winston audit /app/contracts/

# Audit a git repository
INPUT="https://github.com/username/smart-contract-repo.git" npm run docker-up

# Audit a contract from a direct URL
INPUT="https://example.com/path/to/Contract.sol" npm run docker-up

# Force treating a URL as a git repository
docker-compose run --rm winston audit https://github.com/username/repo-without-dotgit --git

# Mount a custom contracts directory
docker run -v /path/to/your/contracts:/app/contracts -v /path/to/output:/app/output \
  --env-file .env winston audit /app/contracts/
```

## Output

Winston generates the following outputs in your specified directory (defaults to `./output`):

- **Diagrams**: 
  - `.dot` file for GraphViz visualization
  - `.mermaid.md` file with Mermaid diagrams for contract structure and flows

- **Analysis**:
  - `.analysis.md` file with detailed security review and business logic analysis
  - `.static-analysis.md` file with static code analysis results (no API key required)

- **Semgrep Rules**:
  - Custom Semgrep rules in YAML format for continued scanning
  - README with instructions on how to use the generated rules

- **Function Explanations**:
  - `.explanations.md` file with detailed function-by-function breakdown
  - `.logic-vulnerabilities.md` file identifying cross-function logic issues

## Example

```bash
# Full audit of an ERC20 token contract
npm run audit -- ./contracts/MyToken.sol

# Generate only function explanations and logic vulnerability analysis
npm run audit -- ./contracts/MyToken.sol --explain

# Audit an entire repository of contracts
npm run audit -- https://github.com/OpenZeppelin/openzeppelin-contracts.git

# Audit a contract from a direct URL
npm run audit -- https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/token/ERC20/ERC20.sol

# Force treating a URL as a git repository
npm run audit -- https://github.com/OpenZeppelin/openzeppelin-contracts --git

# Results will be in ./output/ directory
```

## Requirements

- Node.js 14+
- Anthropic API key (Claude 3.7 access)
- Docker (for containerized usage)
- Git (for repository analysis)

## Limitations

- Winston works best with Solidity smart contracts
- Analysis quality depends on Claude 3.7's understanding of security concepts
- Generated Semgrep rules should be reviewed by a security expert before adoption

## Documentation

- [Explainer Guide](EXPLAINER_GUIDE.md) - Detailed documentation on the function explainer
- [Docker Guide](DOCKER_GUIDE.md) - Instructions for running Winston with Docker
- [External Files Guide](EXTERNAL_FILES_GUIDE.md) - How to analyze external files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[ISC](LICENSE) 