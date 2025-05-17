const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const ora = require('ora');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generates a diagram of the Rust code
 * @param {string} filePath - Path to the Rust file
 * @param {string} outputDir - Directory to save diagram results
 */
async function generateRustDiagram(filePath, outputDir) {
  const spinner = ora('Generating Rust code diagram...').start();
  
  try {
    // Read the code
    const code = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Prompt for Claude 3.7
    const prompt = `
Analyze the following Rust Web3/blockchain code and create a detailed Mermaid diagram that visually represents:
1. Struct and enum definitions
2. Function relationships and call flows
3. Data structure relationships
4. Ownership and borrowing patterns where relevant
5. Important control flow and logic

Rust Code:
\`\`\`rust
${code}
\`\`\`

Create multiple diagrams if needed:
1. A high-level architecture diagram showing the main components
2. A detailed component diagram showing relationships between structs and functions
3. A sequence diagram showing important flows and interactions

Return valid, well-formatted Mermaid diagram code. Use the class diagram notation for structure and sequence diagrams for interactions.

Format your response as:
# Rust Code Architecture: ${fileName}

## High-Level Architecture
\`\`\`mermaid
<diagram code here>
\`\`\`

## Component Relationships
\`\`\`mermaid
<diagram code here>
\`\`\`

## Sequence Flow (if applicable)
\`\`\`mermaid
<diagram code here>
\`\`\`
`;

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      spinner.fail('No API key found');
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }

    try {
      // Call Claude 3.7 API
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4000,
        messages: [
          { 
            role: "user", 
            content: prompt 
          }
        ],
        system: "You are an expert in Rust and software architecture visualization. Generate accurate, clear mermaid diagrams that represent the structure and flow of Rust code."
      });

      // Validate response format
      if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
        spinner.fail('Invalid API response');
        throw new Error('Invalid response format from Anthropic API');
      }

      // Save the response to a file
      const outputPath = path.join(outputDir, `${fileName}.rust-diagram.md`);
      fs.writeFileSync(outputPath, response.content[0].text);
      
      spinner.succeed(`Rust diagram generation complete! Saved to: ${outputPath}`);
      return outputPath;
    } catch (apiError) {
      spinner.fail('API call failed');
      throw apiError;
    }
  } catch (error) {
    spinner.fail('Diagram generation failed');
    throw error;
  }
}

module.exports = {
  generateRustDiagram
}; 