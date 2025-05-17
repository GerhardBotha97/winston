#!/bin/bash

# docker-audit.sh - Helper script to run Winston in Docker with different inputs

# Display help
function show_help {
  echo "Usage: ./docker-audit.sh [OPTIONS] INPUT"
  echo ""
  echo "Run Winston security auditor in Docker with different inputs"
  echo ""
  echo "Options:"
  echo "  -h, --help          Show this help message"
  echo "  -o, --output DIR    Specify output directory (default: ./output)"
  echo "  -d, --diagram       Generate only diagrams"
  echo "  -a, --analysis      Generate only analysis"
  echo "  -s, --semgrep       Generate only semgrep rules"
  echo "  -t, --static        Run only static analysis"
  echo "  -e, --explain       Generate detailed function explanations and logic vulnerability analysis"
  echo "  -r, --rust          Analyze only Rust files"
  echo "  -g, --git           Treat the input URL as a git repository"
  echo ""
  echo "Input can be:"
  echo "  - A single Solidity file (.sol) or Rust file (.rs)"
  echo "  - A directory containing Solidity or Rust files"
  echo "  - A git repository URL (use --git flag to force git clone)"
  echo "  - A direct URL to a contract file (downloads the file)"
  echo ""
  echo "Examples:"
  echo "  ./docker-audit.sh ./contracts/MyToken.sol"
  echo "  ./docker-audit.sh ./rust/token.rs"
  echo "  ./docker-audit.sh ./contracts/"
  echo "  ./docker-audit.sh https://github.com/username/smart-contract-repo.git"
  echo "  ./docker-audit.sh https://example.com/path/to/Contract.sol"
  echo "  ./docker-audit.sh -g https://github.com/username/repo-without-dotgit"
  echo "  ./docker-audit.sh -o ./my-results -d -a ./contracts/MyToken.sol"
  echo "  ./docker-audit.sh -e ./contracts/MyToken.sol"
  echo "  ./docker-audit.sh -r ./rust/token.rs"
}

# Parse command line arguments
PARAMS=""
OPTIONS=""
OUTPUT_DIR="./output"

while (( "$#" )); do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -d|--diagram)
      OPTIONS="$OPTIONS --diagram"
      shift
      ;;
    -a|--analysis)
      OPTIONS="$OPTIONS --analysis"
      shift
      ;;
    -s|--semgrep)
      OPTIONS="$OPTIONS --semgrep"
      shift
      ;;
    -t|--static)
      OPTIONS="$OPTIONS --static"
      shift
      ;;
    -e|--explain)
      OPTIONS="$OPTIONS --explain"
      shift
      ;;
    -r|--rust)
      OPTIONS="$OPTIONS --rust"
      shift
      ;;
    -g|--git)
      OPTIONS="$OPTIONS --git"
      shift
      ;;
    --) # end argument parsing
      shift
      break
      ;;
    -*) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      echo "Run './docker-audit.sh --help' for usage information" >&2
      exit 1
      ;;
    *) # preserve positional arguments
      PARAMS="$PARAMS $1"
      shift
      ;;
  esac
done

# Set positional arguments in their proper place
eval set -- "$PARAMS"

# Check if input is provided
if [ -z "$1" ]; then
  echo "Error: No input specified" >&2
  echo "Run './docker-audit.sh --help' for usage information" >&2
  exit 1
fi

# Get absolute path for output directory
OUTPUT_DIR=$(realpath "$OUTPUT_DIR")

# Set up environment file
DEFAULT_ENV_FILE="./.env"

# Fix API key format if needed
fix_env_file() {
  local env_file="$1"
  
  if [ -f "$env_file" ]; then
    # Create a temporary file
    local temp_file=$(mktemp)
    
    # Extract API key, removing any line breaks, and save to temp file
    grep -h "ANTHROPIC_API_KEY" "$env_file" | tr -d '\n\r' > "$temp_file"
    
    # If the temp file doesn't have an API key line, something went wrong
    if ! grep -q "ANTHROPIC_API_KEY" "$temp_file"; then
      echo "Error: Failed to fix API key in $env_file" >&2
      rm "$temp_file"
      return 1
    fi
    
    # Make sure there's a newline at the end of the file
    echo "" >> "$temp_file"
    
    # Replace the original file with the fixed one
    mv "$temp_file" "$env_file"
    return 0
  fi
  return 1
}

# Set up environment file
if [ -z "$ENV_FILE" ]; then
  # Check if default .env file exists
  if [ -f "$DEFAULT_ENV_FILE" ]; then
    # Fix the env file
    echo "Ensuring API key format is correct..."
    fix_env_file "$DEFAULT_ENV_FILE"
    ENV_FILE="$DEFAULT_ENV_FILE"
  else
    echo "Warning: No .env file found. Make sure ANTHROPIC_API_KEY is set in environment." >&2
    # Create an empty env file if it doesn't exist
    touch "$DEFAULT_ENV_FILE"
    ENV_FILE="$DEFAULT_ENV_FILE"
  fi
fi

# Extract API key from env file
if [ -f "$ENV_FILE" ]; then
  # Get the API key part after the equals sign, and trim whitespace
  ANTHROPIC_API_KEY=$(grep "ANTHROPIC_API_KEY" "$ENV_FILE" | cut -d '=' -f2 | tr -d ' \t\r\n')
fi

# Check if we have an API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Warning: No ANTHROPIC_API_KEY found in $ENV_FILE or environment" >&2
  echo "Analysis features requiring Claude 3.7 API will fail" >&2
fi

# Detect file type
if [[ "$1" == *.rs ]]; then
  echo "Detected Rust file, adding --rust flag if not present"
  if [[ "$OPTIONS" != *"--rust"* ]]; then
    OPTIONS="$OPTIONS --rust"
  fi
fi

# Prepare the command
INPUT="$1"
COMMAND="audit $INPUT $OPTIONS --output /app/output"

# Run Winston in Docker
echo "Running Winston in Docker"
echo "Input: $INPUT"
echo "Output directory: $OUTPUT_DIR"
echo "Options: $OPTIONS"
echo "Using env file: $ENV_FILE"
echo ""

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

export OUTPUT_DIR
export INPUT
export ENV_FILE
export ANTHROPIC_API_KEY

docker-compose run --rm winston $COMMAND 