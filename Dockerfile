FROM node:18-slim

# Install GraphViz for diagram generation, Git for repo cloning, and Rust tools
RUN apt-get update && apt-get install -y graphviz git curl build-essential && apt-get clean

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Rust security audit tools
RUN cargo install cargo-audit cargo-deny

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Create output directory and temp repos directory
RUN mkdir -p output temp_repos

# Set environment variables
ENV NODE_ENV=production

# Make index.js executable
RUN chmod +x index.js

# Entry point
ENTRYPOINT ["node", "index.js"]