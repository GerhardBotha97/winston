const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const ora = require('ora');
const yaml = require('js-yaml');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generates Semgrep rules for Rust Web3/blockchain code
 * @param {string} filePath - Path to the Rust file
 * @param {string} outputDir - Directory to save semgrep rules
 */
async function generateRustSemgrepRules(filePath, outputDir) {
  const spinner = ora('Generating Rust semgrep rules with Claude 3.7...').start();
  
  try {
    // Read the contract code
    const contractCode = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Create output directory for semgrep rules if it doesn't exist
    const semgrepDir = path.join(outputDir, 'semgrep-rust-rules');
    fs.mkdirSync(semgrepDir, { recursive: true });
    
    // Prompt for Claude 3.7
    const prompt = `
You are an expert Rust security auditor specializing in Web3 and blockchain. Generate Semgrep rules that can detect potential security issues in Rust code similar to this:

\`\`\`rust
${contractCode}
\`\`\`

For each potential vulnerability or bug pattern, create a Semgrep rule in YAML format. Structure each rule as follows:

\`\`\`yaml
rules:
  - id: rust-[unique-id-for-the-rule]
    message: "[Brief description of the issue]"
    metadata:
      category: security
      technology:
        - rust
        - web3
      severity: [ERROR|WARNING|INFO]
      likelihood: [HIGH|MEDIUM|LOW]
      impact: [HIGH|MEDIUM|LOW]
      confidence: [HIGH|MEDIUM|LOW]
    languages: [rust]
    pattern: [The pattern to match problematic code]
    pattern-not: [Optional pattern that should not match]
    patterns:
      - pattern: [Alternative pattern syntax if needed]
        pattern-not: [Optional exclude pattern]
    fix: [Optional fix suggestion]
\`\`\`

Generate at least 5 different rules covering these categories:
1. Memory safety issues (e.g., unsafe blocks without proper validation)
2. Numeric overflow/underflow vulnerabilities 
3. Improper error handling
4. Potential reentrancy vulnerabilities in Web3 context
5. Authorization issues like missing permission checks

Ensure the rules are specific to Rust and applicable to Web3/blockchain code. Provide accurate pattern matching that will work with the Semgrep engine.
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
        system: "You are an expert in Rust security and Semgrep pattern development. Generate precise, effective rules that detect security issues in Rust Web3/blockchain code."
      });

      // Validate response format
      if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
        spinner.fail('Invalid API response');
        throw new Error('Invalid response format from Anthropic API');
      }

      // Extract YAML rules from response
      const text = response.content[0].text;
      const yamlBlocks = text.match(/```yaml[\s\S]*?```/g) || [];
      
      if (yamlBlocks.length === 0) {
        spinner.warn('No YAML rules found in API response');
      }
      
      // Counter for the total number of individual rules
      let totalRuleCount = 0;
      
      // Process each YAML block
      for (let i = 0; i < yamlBlocks.length; i++) {
        const yamlContent = yamlBlocks[i].replace(/```yaml|```/g, '').trim();
        if (!yamlContent) continue;
        
        try {
          // Parse the YAML to extract individual rules
          const parsedYaml = yaml.load(yamlContent);
          
          if (parsedYaml && parsedYaml.rules && Array.isArray(parsedYaml.rules)) {
            // Save each rule to a separate file
            for (let j = 0; j < parsedYaml.rules.length; j++) {
              const rule = parsedYaml.rules[j];
              if (!rule.id) {
                continue; // Skip rules without an ID
              }
              
              // Create a new YAML document with just this rule
              const singleRuleYaml = {
                rules: [rule]
              };
              
              // Convert back to YAML string
              const singleRuleContent = yaml.dump(singleRuleYaml);
              
              // Create a descriptive filename based on the rule ID
              const ruleFileName = `${rule.id}-${fileName}.yml`;
              const rulePath = path.join(semgrepDir, ruleFileName);
              
              // Save the rule to its own file
              fs.writeFileSync(rulePath, singleRuleContent);
              totalRuleCount++;
            }
          }
        } catch (yamlError) {
          // If YAML parsing fails, save the raw content
          const fallbackPath = path.join(semgrepDir, `raw_rule_${i+1}_${fileName}.yml`);
          fs.writeFileSync(fallbackPath, yamlContent);
          totalRuleCount++;
          spinner.warn(`Could not parse YAML for rule ${i+1}, saving raw content`);
        }
      }
      
      // If no rules were extracted properly, save the entire response
      if (totalRuleCount === 0) {
        const fullResponsePath = path.join(semgrepDir, `full_response_${fileName}.md`);
        fs.writeFileSync(fullResponsePath, text);
        totalRuleCount = 1; // At least we saved the full response
      }
      
      spinner.succeed(`Semgrep rules generated! ${totalRuleCount} rules saved to: ${semgrepDir}`);
      return semgrepDir;
    } catch (apiError) {
      spinner.fail('API call failed');
      throw apiError;
    }
  } catch (error) {
    spinner.fail('Semgrep rule generation failed');
    throw error;
  }
}

module.exports = {
  generateRustSemgrepRules
}; 