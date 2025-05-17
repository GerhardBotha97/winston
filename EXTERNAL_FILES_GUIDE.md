# Using Winston with External Files and Directories

This guide explains how to use Winston with external files and directories for better flexibility and security.

## Overview

Winston can now use external files and directories through environment variables:

- `CONTRACT_DIR`: Path to your contracts directory
- `OUTPUT_DIR`: Path to your output directory
- `CONTRACT_FILE`: Name of the contract file to analyze
- `ENV_FILE`: Path to your .env file with API keys

## Quick Start

The easiest way to use external files is with the provided script:

```bash
# Basic usage with default locations
./run_with_external.sh

# Using external directories
./run_with_external.sh \
  --contracts /path/to/contracts \
  --output /path/to/output \
  --file YourContract.sol \
  --env /path/to/your/.env
```

## Setting Up Your .env File

Create a .env file anywhere on your system with your API key:

```bash
# Example .env file
echo "ANTHROPIC_API_KEY=your_api_key_here" > /path/to/your/.env
```

## Running with Environment Variables

If you prefer to use docker-compose directly, you can set environment variables:

```bash
# Set environment variables
export CONTRACT_DIR=/path/to/contracts
export OUTPUT_DIR=/path/to/output
export CONTRACT_FILE=YourContract.sol
export ENV_FILE=/path/to/your/.env

# Run docker-compose
docker-compose up
```

## Example: Using Temporary External Files

A complete example is provided in `run_external_example.sh`, which:

1. Creates a temporary location for the API key
2. Sets up temporary directories for contracts and output
3. Copies a sample contract to the external location
4. Runs Winston using the external files

To try it:

```bash
./run_external_example.sh
```

## Security Benefits

Using external files provides several security advantages:

1. Sensitive API keys can be stored outside your project directory
2. Different API keys can be used for different environments
3. Contract files can be kept in a separate, secure location
4. Output files can be directed to specific locations

## Troubleshooting

If you encounter errors:

1. Make sure all directories exist (the script will create output directories but requires existing contract directories)
2. Verify your .env file contains the correct API key
3. Check file permissions on all external files
4. For absolute paths, make sure they are fully qualified (starting with `/`) 