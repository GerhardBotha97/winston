# Winston Docker Guide

This guide explains how to use the Winston Web3 AI Security Auditor with Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, but recommended)
- An Anthropic API key with Claude 3.7 access

## Quick Start

### 1. Build the Docker Image

```bash
# Option 1: Using the provided script (recommended)
./build_docker.sh

# Option 2: Using Docker directly
docker build -t winston .
```

### 2. Set Up Your Environment

Create a `.env` file with your Anthropic API key:

```bash
echo "ANTHROPIC_API_KEY=your_actual_api_key_here" > .env
```

### 3. Run the Container

#### Using Docker Compose (recommended)

```bash
# Run with the default SimpleToken.sol contract
docker-compose up

# Run with specific options
docker-compose run --rm winston audit /app/contracts/YourContract.sol --diagram --analysis
```

#### Using Docker Directly

```bash
# Basic usage with mounted volumes
docker run --rm \
  -e ANTHROPIC_API_KEY=$(cat .env | grep ANTHROPIC_API_KEY | cut -d '=' -f2) \
  -v $(pwd)/contracts:/app/contracts \
  -v $(pwd)/output:/app/output \
  winston audit /app/contracts/SimpleToken.sol
  
# With specific options
docker run --rm \
  -e ANTHROPIC_API_KEY=$(cat .env | grep ANTHROPIC_API_KEY | cut -d '=' -f2) \
  -v $(pwd)/contracts:/app/contracts \
  -v $(pwd)/output:/app/output \
  winston audit /app/contracts/SimpleToken.sol --diagram --analysis
```

## Working with Custom Contracts

To audit your own smart contracts, you can:

### 1. Add Contracts to the Contracts Directory

```bash
# Copy your contract into the contracts directory
cp path/to/your/SmartContract.sol ./contracts/

# Then run the container
docker-compose run --rm winston audit /app/contracts/SmartContract.sol
```

### 2. Mount a Different Contracts Directory

```bash
# Using Docker Compose
docker-compose run --rm \
  -v /path/to/your/contracts:/app/contracts \
  winston audit /app/contracts/SmartContract.sol

# Using Docker directly
docker run --rm \
  -e ANTHROPIC_API_KEY=$(cat .env | grep ANTHROPIC_API_KEY | cut -d '=' -f2) \
  -v /path/to/your/contracts:/app/contracts \
  -v $(pwd)/output:/app/output \
  winston audit /app/contracts/SmartContract.sol
```

## Available Options

Winston supports the following command-line options:

- `--diagram` or `-d`: Generate only code diagrams
- `--analysis` or `-a`: Generate only the security analysis
- `--semgrep` or `-s`: Generate only Semgrep rules
- `--output <directory>` or `-o <directory>`: Specify a custom output directory

Example:

```bash
docker-compose run --rm winston audit /app/contracts/SimpleToken.sol --diagram --output /app/output/custom-dir
```

## Viewing Results

The analysis results will be available in the `./output` directory on your host machine, which is mounted to `/app/output` in the container.

## Troubleshooting

### API Key Issues

If you encounter errors related to the API key:

1. Make sure your `.env` file is correctly formatted
2. Ensure the API key is valid and has access to Claude 3.7
3. Try passing the API key directly:

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY="your_api_key_here" \
  -v $(pwd)/contracts:/app/contracts \
  -v $(pwd)/output:/app/output \
  winston audit /app/contracts/SimpleToken.sol
```

### Permission Issues with Output Directory

If you encounter permission issues with the output directory:

```bash
# Fix permissions
sudo chown -R $(id -u):$(id -g) ./output
```

### Container Resource Constraints

For large contracts or extensive analysis, you might need to allocate more resources:

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY=$(cat .env | grep ANTHROPIC_API_KEY | cut -d '=' -f2) \
  -v $(pwd)/contracts:/app/contracts \
  -v $(pwd)/output:/app/output \
  --memory=4g \
  --cpus=2 \
  winston audit /app/contracts/SimpleToken.sol
``` 