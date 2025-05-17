const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const ora = require('ora');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generates semgrep rules for the smart contract
 * @param {string} filePath - Path to the smart contract file
 * @param {string} outputDir - Directory to save semgrep rules
 */
async function generateSemgrepRules(filePath, outputDir) {
  const spinner = ora('Generating Semgrep rules...').start();
  
  try {
    // Read the contract code
    const contractCode = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Generate semgrep rules using Claude 3.7
    const semgrepRules = await generateRules(contractCode);
    
    // Create output directory for rules
    const rulesDir = path.join(outputDir, 'semgrep-rules');
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    
    // Save rules to YAML files
    for (let i = 0; i < semgrepRules.length; i++) {
      const rule = semgrepRules[i];
      const ruleFileName = `${fileName}-rule-${i+1}.yaml`;
      const rulePath = path.join(rulesDir, ruleFileName);
      fs.writeFileSync(rulePath, rule);
    }
    
    // Generate README with instructions
    const readmePath = path.join(rulesDir, 'README.md');
    const readmeContent = generateReadme(fileName, semgrepRules.length);
    fs.writeFileSync(readmePath, readmeContent);
    
    spinner.succeed(`Semgrep rules generated! ${semgrepRules.length} rules saved to: ${rulesDir}`);
    return rulesDir;
    
  } catch (error) {
    spinner.fail('Rule generation failed');
    throw error;
  }
}

/**
 * Generates semgrep rules using Claude 3.7
 * @param {string} contractCode - Source code of the contract
 * @returns {Array<string>} - Array of semgrep rules in YAML format
 */
async function generateRules(contractCode) {
  try {
    // Prompt for Claude 3.7
    const prompt = `
You are an expert in Solidity security and Semgrep rule creation. Analyze this smart contract and generate Semgrep rules to detect security vulnerabilities and code quality issues:

\`\`\`solidity
${contractCode}
\`\`\`

Create 5-10 specific Semgrep rules that can detect common vulnerabilities in this contract and similar contracts. Each rule should:

1. Focus on one specific security vulnerability or code quality issue relevant to this contract
2. Include pattern matching that's precise enough to minimize false positives
3. Be in proper YAML format for Semgrep
4. Include metadata (id, severity, message) that clearly describes the issue
5. Be specific to the actual vulnerabilities identified in the contract

For each rule, explain:
- What vulnerability or issue it detects
- Why it's important
- How to fix the issue

Return each rule as a separate YAML file, properly formatted for immediate use with Semgrep.
`;

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Warning: ANTHROPIC_API_KEY not found in environment variables');
      return [];
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
        system: "You are an expert security rule creator with deep knowledge of Semgrep pattern matching for smart contracts."
      });

      // Validate response format
      if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
        console.error('Invalid response format from Anthropic API:', response);
        return [];
      }

      // Extract YAML rules from the response
      const content = response.content[0].text;
      const yamlBlocks = extractYamlBlocks(content);
      
      return yamlBlocks;
    } catch (apiError) {
      console.error('API call error:', apiError);
      return [];
    }
  } catch (error) {
    console.error('Error generating semgrep rules:', error);
    return [];
  }
}

/**
 * Extracts YAML blocks from a text
 * @param {string} text - Text containing YAML blocks
 * @returns {Array<string>} - Array of YAML blocks
 */
function extractYamlBlocks(text) {
  const yamlRegex = /```(?:yaml|yml)?\s*([\s\S]*?)```/g;
  const yamlBlocks = [];
  let match;
  
  while ((match = yamlRegex.exec(text)) !== null) {
    yamlBlocks.push(match[1].trim());
  }
  
  // If no YAML blocks found, try to extract content between yaml/yml markers
  if (yamlBlocks.length === 0) {
    const markers = text.split(/(?:yaml|yml):/g);
    if (markers.length > 1) {
      for (let i = 1; i < markers.length; i++) {
        const block = markers[i].trim();
        if (block) {
          yamlBlocks.push(block);
        }
      }
    }
  }
  
  return yamlBlocks;
}

/**
 * Generates a README file for semgrep rules
 * @param {string} fileName - Name of the analyzed file
 * @param {number} rulesCount - Number of rules generated
 * @returns {string} - README content
 */
function generateReadme(fileName, rulesCount) {
  return `# Semgrep Rules for ${fileName}

This directory contains ${rulesCount} Semgrep rules generated specifically for analyzing ${fileName} and similar smart contracts.

## Usage

To run these rules against a smart contract, use:

\`\`\`bash
semgrep --config ./semgrep-rules path/to/contract.sol
\`\`\`

## Rule Details

Each rule is designed to detect specific security vulnerabilities or code quality issues in Solidity contracts.

For more information on Semgrep, visit: https://semgrep.dev/

## Custom Rules

These rules are generated based on the specific patterns and vulnerabilities found in the analyzed contract. You can modify and extend these rules for your own use cases.
`;
}

module.exports = {
  generateSemgrepRules
}; 