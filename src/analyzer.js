const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const ora = require('ora');
const parser = require('@solidity-parser/parser');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Main function to analyze a smart contract file (Solidity or Rust)
 * @param {string} filePath - Path to the smart contract file
 * @param {string} outputDir - Directory to save analysis results
 * @param {Object} options - Additional options
 * @returns {Object} - Paths to generated analysis files
 */
async function analyzeSmartContract(filePath, outputDir, options = {}) {
  // Determine file type
  const fileExt = path.extname(filePath).toLowerCase();
  const isRust = fileExt === '.rs';
  
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Analyze based on file type
    const securityAnalysisPath = isRust 
      ? await analyzeRustContract(filePath, outputDir)
      : await analyzeSolidityContract(filePath, outputDir);
    
    // Generate detailed code explanations if requested
    let explanationResults = null;
    if (options.generateExplanations !== false) {
      explanationResults = await explainCode(filePath, outputDir, isRust);
    }
    
    return {
      securityAnalysisPath,
      ...(explanationResults || {}),
    };
  } catch (error) {
    console.error(`Error analyzing ${isRust ? 'Rust' : 'Solidity'} contract:`, error);
    throw error;
  }
}

/**
 * Analyzes a Solidity smart contract for functionality and security issues
 * @param {string} filePath - Path to the Solidity file
 * @param {string} outputDir - Directory to save analysis results
 * @returns {string} - Path to the generated analysis file
 */
async function analyzeSolidityContract(filePath, outputDir) {
  const spinner = ora('Analyzing Solidity contract with Claude 3.7...').start();
  
  try {
    // Read the contract code
    const contractCode = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Parse the contract to extract basic information
    let contractInfo = {};
    try {
      const ast = parser.parse(contractCode, { loc: true });
      contractInfo = extractContractInfo(ast);
    } catch (parseError) {
      console.warn(`Could not parse Solidity code: ${parseError.message}`);
    }
    
    // Prompt for Claude 3.7
    const prompt = `
You are an expert smart contract auditor with exceptional skill at finding subtle logic errors that automated tools cannot detect. Analyze the following Web3/blockchain contract:

${contractCode}

Your PRIMARY goal is to identify SUBTLE LOGIC VULNERABILITIES that automated scanning tools would miss and that only an experienced human auditor could find. Pay special attention to:
- Business logic flaws in how contract components interact
- Edge cases in state transitions 
- Logical contradictions between different contract functions
- Protocol-specific vulnerabilities based on the contract's domain
- Economic attack vectors that exploit incentive misalignments
- Integration risks between this contract and external systems

Provide a detailed security analysis that includes:

1. SUMMARY: High-level overview of what this contract does (2-3 sentences)
2. CONTRACT ARCHITECTURE: Key components, inheritance, and their relationships
3. BUSINESS LOGIC ANALYSIS: Detailed explanation of core functionality
4. RISK ASSESSMENT:
   a. High-risk issues (critical vulnerabilities)
   b. Medium-risk issues (potential vulnerabilities)
   c. Low-risk issues (code improvement opportunities)
5. ATTACK VECTORS: Potential ways the contract could be exploited
6. RECOMMENDATIONS: Specific code changes to improve security

Specifically check for the following vulnerability categories:

ACCESS CONTROL:
- Authorization Through tx.origin
- Insufficient Access Control
- Delegatecall to Untrusted Callee
- Signature Malleability
- Missing Protection against Signature Replay Attacks

MATH:
- Integer Overflow and Underflow
- Off-By-One
- Lack of Precision

CONTROL FLOW:
- Reentrancy
- DoS with Block Gas Limit
- DoS with (Unexpected) revert
- Using msg.value in a Loop
- Transaction-Ordering Dependence
- Insufficient Gas Griefing

DATA HANDLING:
- Unchecked Return Value
- Write to Arbitrary Storage Location
- Unbounded Return Data
- Uninitialized Storage Pointer
- Unexpected ecrecover null address

UNSAFE LOGIC:
- Weak Sources of Randomness from Chain Attributes
- Hash Collision when using abi.encodePacked() with Multiple Variable-Length Arguments
- Timestamp Dependence
- Unsafe Low-Level Call
- Unsupported Opcodes
- Unencrypted Private Data On-Chain
- Asserting Contract from Code Size

CODE QUALITY:
- Floating Pragma
- Outdated Compiler Version
- Use of Deprecated Functions
- Incorrect Constructor Name
- Shadowing State Variables
- Incorrect Inheritance Order
- Presence of Unused Variables
- Default Visibility
- Inadherence to Standards
- Assert Violation
- Requirement Violation

SUBTLE LOGIC FLAWS:
- Logical constraints that contradict business requirements
- Incorrect assumptions about external contract behavior
- State inconsistencies under specific sequences of operations
- Incentive misalignments leading to economic exploits
- Multi-transaction attack vectors
- Inadequate validation of complex data structures
- Timing issues in multi-step processes
- Missing edge cases in business logic

Focus on finding hidden logic issues that even most security auditors would miss. Analyze the contract as if you were the most skilled attacker in the world with perfect understanding of the codebase. Identify vulnerabilities that can only be discovered through deep reasoning about the contract's behavior.
`;

    const response = await callAnthropicAPI(prompt, "You are an expert smart contract security auditor with deep knowledge of Web3 vulnerabilities and best practices.");
    
    // Save the response to a file
    const outputPath = path.join(outputDir, `${fileName}.analysis.md`);
    fs.writeFileSync(outputPath, response);
    
    spinner.succeed(`Solidity security analysis complete! Saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    spinner.fail('Solidity analysis failed');
    throw error;
  }
}

/**
 * Analyzes a Rust smart contract for Web3/blockchain functionality and security issues
 * @param {string} filePath - Path to the Rust file
 * @param {string} outputDir - Directory to save analysis results
 * @returns {string} - Path to the generated analysis file
 */
async function analyzeRustContract(filePath, outputDir) {
  const spinner = ora('Analyzing Rust contract with Claude 3.7...').start();
  
  try {
    // Read the contract code
    const contractCode = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Prompt for Claude 3.7
    const prompt = `
You are an expert Rust and blockchain security auditor with exceptional skill at finding subtle logic errors that automated tools cannot detect. Analyze the following Rust Web3/blockchain code:

${contractCode}

Your PRIMARY goal is to identify SUBTLE LOGIC VULNERABILITIES that automated scanning tools would miss and that only an experienced human auditor could find. Pay special attention to:
- Business logic flaws in how components interact
- Edge cases in state transitions and error handling
- Logical contradictions between different functions
- Protocol-specific vulnerabilities based on the code's domain
- Economic attack vectors that exploit incentive misalignments
- Integration risks between this code and external systems
- Rust-specific logical issues that arise from ownership, borrowing, and lifetime constraints

Provide a detailed security analysis that includes:

1. SUMMARY: High-level overview of what this Rust code does (2-3 sentences)
2. CODE ARCHITECTURE: Key components and their relationships
3. BUSINESS LOGIC ANALYSIS: Detailed explanation of core functionality
4. RISK ASSESSMENT:
   a. High-risk issues (critical vulnerabilities)
   b. Medium-risk issues (potential vulnerabilities)
   c. Low-risk issues (code improvement opportunities)
5. BLOCKCHAIN-SPECIFIC ISSUES: Analysis of any Web3/blockchain-specific vulnerabilities
6. RECOMMENDATIONS: Specific code changes to improve security

Specifically check for the following vulnerability categories:

ACCESS CONTROL:
- Authorization Issues
- Insufficient Access Control
- Insecure Permission Management
- Signature Verification Flaws
- Missing Protection against Signature Replay Attacks

MATH:
- Integer Overflow and Underflow
- Off-By-One Errors
- Lack of Precision
- Arithmetic Errors

CONTROL FLOW:
- Reentrancy Equivalents
- Deadlocks
- Race Conditions
- Unexpected Panics
- Error Handling Weaknesses

DATA HANDLING:
- Unchecked Return Values
- Memory Safety Issues
- Improper State Management
- Uninitialized Variables
- Unsafe Type Conversions

UNSAFE LOGIC:
- Weak Sources of Randomness
- Inadequate Cryptographic Practices
- Timestamp Dependence
- Unsafe Block Operations
- Incorrect Error Handling
- Unencrypted Private Data
- Improper Use of 'unsafe' Blocks

CODE QUALITY:
- Outdated Dependencies
- Use of Deprecated Functions
- Inefficient Resource Management
- Memory Leaks
- Inadequate Error Handling
- Presence of Unused Variables
- Insufficient Documentation
- Improper Testing Coverage
- Violation of Rust Best Practices

SUBTLE LOGIC FLAWS:
- Logical constraints that contradict business requirements
- Incorrect assumptions about external system behavior
- State inconsistencies under specific sequences of operations
- Incentive misalignments leading to economic exploits
- Multi-operation attack vectors
- Inadequate validation of complex data structures
- Timing issues in multi-step processes
- Missing edge cases in business logic
- Ownership and borrowing patterns that could lead to unexpected behavior
- Thread-safety issues in concurrent contexts

Focus on finding hidden logic issues that even most security auditors would miss. Analyze the code as if you were the most skilled attacker in the world with perfect understanding of the codebase. Identify vulnerabilities that can only be discovered through deep reasoning about the code's behavior.
`;

    const response = await callAnthropicAPI(prompt, "You are an expert Rust and blockchain security auditor with deep knowledge of Web3 vulnerabilities, Rust's memory safety features, and smart contract best practices.");
    
    // Save the response to a file
    const outputPath = path.join(outputDir, `${fileName}.rust-analysis.md`);
    fs.writeFileSync(outputPath, response);
    
    spinner.succeed(`Rust security analysis complete! Saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    spinner.fail('Rust analysis failed');
    throw error;
  }
}

/**
 * Analyzes a codebase (directory) containing multiple smart contract files
 * @param {string} inputPath - Path to directory containing contract files
 * @param {string} outputDir - Directory to save analysis results
 * @param {Object} options - Additional options
 * @returns {Array} - Paths to all generated analysis files
 */
async function analyzeCodebase(inputPath, outputDir, options = {}) {
  try {
    const stats = fs.statSync(inputPath);
    
    if (stats.isFile()) {
      // Single file analysis
      const fileExt = path.extname(inputPath).toLowerCase();
      if (fileExt === '.rs' || fileExt === '.sol') {
        return await analyzeSmartContract(inputPath, outputDir, options);
      } else {
        console.log(`Skipping unsupported file type: ${inputPath}`);
        return null;
      }
    } else if (stats.isDirectory()) {
      // Process all supported files in the directory
      const results = [];
      const files = fs.readdirSync(inputPath);
      
      for (const file of files) {
        const filePath = path.join(inputPath, file);
        const fileStats = fs.statSync(filePath);
        
        if (fileStats.isFile()) {
          const fileExt = path.extname(filePath).toLowerCase();
          if (fileExt === '.rs' || fileExt === '.sol') {
            const result = await analyzeSmartContract(filePath, outputDir, options);
            results.push(result);
          }
        }
      }
      
      return results;
    }
  } catch (error) {
    console.error('Error analyzing codebase:', error);
    throw error;
  }
}

/**
 * Deep-explains code functions and identifies logic vulnerabilities
 * @param {string} filePath - Path to the smart contract file
 * @param {string} outputDir - Directory to save analysis results
 * @param {boolean} isRust - Whether the file is Rust code
 * @returns {Object} - Paths to explanation and vulnerability files
 */
async function explainCode(filePath, outputDir, isRust = false) {
  const spinner = ora('Generating detailed function explanations...').start();
  
  try {
    // Read the code
    const code = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Extract functions for better context
    let functionList = [];
    if (!isRust) {
      // Extract Solidity functions
      try {
        const ast = parser.parse(code, { loc: true });
        functionList = extractSolidityFunctions(ast);
      } catch (parseError) {
        console.warn(`Could not parse Solidity code: ${parseError.message}`);
      }
    }
    
    // Prepare function context for the prompt
    const functionContext = functionList.length > 0 
      ? `\nIdentified functions:\n${functionList.map(f => `- ${f.name || 'constructor/fallback'} (${f.visibility || 'default'})`).join('\n')}`
      : '';
    
    // Generate detailed explanations
    const explanations = await generateExplanations(code, fileName, functionContext, isRust);
    
    // Save explanations to file
    const outputPath = path.join(outputDir, `${fileName}.explanations.md`);
    fs.writeFileSync(outputPath, explanations);
    
    // Generate vulnerability report based on explanations
    const vulnerabilityReport = await generateVulnerabilityReport(explanations, code, isRust);
    
    // Save vulnerability report to file
    const vulnOutputPath = path.join(outputDir, `${fileName}.logic-vulnerabilities.md`);
    fs.writeFileSync(vulnOutputPath, vulnerabilityReport);
    
    spinner.succeed(`Code explanations and logic vulnerability analysis complete!\nSaved to:\n- ${outputPath}\n- ${vulnOutputPath}`);
    return { explanationsPath: outputPath, vulnerabilitiesPath: vulnOutputPath };
  } catch (error) {
    spinner.fail('Code explanation failed');
    throw error;
  }
}

/**
 * Extract basic information from the Solidity contract AST
 * @param {Object} ast - The parsed AST of the contract
 * @returns {Object} - Contract information
 */
function extractContractInfo(ast) {
  const contracts = [];
  let contractNodes = [];
  
  // Visit all nodes to find contract definitions
  parser.visit(ast, {
    ContractDefinition: function(node) {
      contractNodes.push(node);
    }
  });
  
  for (const contract of contractNodes) {
    const contractInfo = {
      name: contract.name,
      functions: [],
      stateVars: [],
      events: []
    };
    
    // Find functions, state variables, and events in the contract
    parser.visit(contract, {
      FunctionDefinition: function(node) {
        const modifiers = [];
        if (node.modifiers) {
          for (const mod of node.modifiers) {
            modifiers.push(mod.name);
          }
        }
        
        contractInfo.functions.push({
          name: node.name || (node.isConstructor ? "constructor" : "fallback/receive"),
          visibility: node.visibility,
          isConstructor: node.isConstructor,
          modifiers: modifiers
        });
      },
      StateVariableDeclaration: function(node) {
        for (const variable of node.variables) {
          contractInfo.stateVars.push({
            name: variable.name,
            typeName: variable.typeName.name || (variable.typeName.type === 'ElementaryTypeName' ? variable.typeName.name : 'complex'),
            visibility: variable.visibility
          });
        }
      },
      EventDefinition: function(node) {
        const parameters = [];
        if (node.parameters) {
          for (const param of node.parameters) {
            parameters.push({
              name: param.name,
              typeName: param.typeName.name || 'complex'
            });
          }
        }
        
        contractInfo.events.push({
          name: node.name,
          parameters: parameters
        });
      }
    });
    
    contracts.push(contractInfo);
  }
  
  return { contracts };
}

/**
 * Extract function information from Solidity AST
 * @param {Object} ast - The Solidity AST
 * @returns {Array} List of function objects
 */
function extractSolidityFunctions(ast) {
  const functions = [];
  
  parser.visit(ast, {
    FunctionDefinition: function(node) {
      functions.push({
        name: node.name || (node.isConstructor ? 'constructor' : 'fallback/receive'),
        visibility: node.visibility || 'default',
        stateMutability: node.stateMutability || 'non-payable',
        isConstructor: node.isConstructor,
        parameters: node.parameters ? node.parameters.map(p => ({
          name: p.name,
          typeName: p.typeName.name || 'complex'
        })) : [],
        location: node.loc ? {
          start: node.loc.start.line,
          end: node.loc.end.line
        } : null
      });
    }
  });
  
  return functions;
}

/**
 * Generate detailed explanations for the code
 * @param {string} code - Source code
 * @param {string} fileName - Name of the file
 * @param {string} functionContext - Context about extracted functions
 * @param {boolean} isRust - Whether the file is Rust code
 * @returns {string} - Markdown formatted explanations
 */
async function generateExplanations(code, fileName, functionContext, isRust) {
  // Prompt for Claude 3.7
  const language = isRust ? 'Rust' : 'Solidity';
  const prompt = `
You are an expert ${language} developer and security auditor. I need you to create a detailed explanation of the following ${language} code:

\`\`\`${isRust ? 'rust' : 'solidity'}
${code}
\`\`\`
${functionContext}

Provide an extremely detailed function-by-function breakdown that includes:

1. OVERVIEW: High-level summary of what the code does (2-3 sentences)

2. FUNCTION EXPLANATIONS: For each function:
   a. Name and signature
   b. Purpose and business logic
   c. Parameters and return values
   d. Control flow analysis
   e. State modifications
   f. Interactions with other functions/contracts
   g. Execution paths and edge cases

3. DATA FLOW: How data moves between functions, and dependencies between them

4. ASSUMPTIONS: Implicit assumptions the code makes that could lead to logic bugs

Format each function explanation with clear headings and sub-sections. Be extremely thorough in explaining the logic.
`;

  return await callAnthropicAPI(prompt, `You are an expert ${language} code explainer. Generate extremely detailed and precise explanations of code functions, describing exactly how they work line-by-line.`);
}

/**
 * Generate vulnerability report based on code explanations
 * @param {string} explanations - Detailed code explanations
 * @param {string} originalCode - Original source code
 * @param {boolean} isRust - Whether the file is Rust code
 * @returns {string} - Markdown formatted vulnerability report
 */
async function generateVulnerabilityReport(explanations, originalCode, isRust) {
  // Prompt for Claude 3.7
  const language = isRust ? 'Rust' : 'Solidity';
  const prompt = `
You are an expert ${language} security auditor. I have a detailed explanation of ${language} code and the original code. 
I need you to identify ONLY EXPLOITABLE vulnerabilities based on the detailed explanations.

ORIGINAL CODE:
\`\`\`${isRust ? 'rust' : 'solidity'}
${originalCode}
\`\`\`

DETAILED EXPLANATIONS:
${explanations}

Based on these detailed explanations, identify ONLY vulnerabilities that are potentially exploitable by attackers or could lead to direct security issues. For each vulnerability, you MUST assign a confidence rating from 1-5:

1 - Low confidence: Potential issue that requires very specific conditions
2 - Somewhat confident: Likely an issue but requires further validation
3 - Confident: Clear vulnerability with reasonable exploitation path
4 - Very confident: Highly exploitable vulnerability with straightforward attack vector
5 - Certain: Definite vulnerability with trivial exploitation

For each vulnerability:
- Clearly state the vulnerability
- Assign a confidence rating (1-5)
- Reference specific functions and lines of code
- Explain the exploitation path or attack vector
- Describe the potential impact if exploited
- Suggest a fix

ONLY include vulnerabilities that have a realistic exploitation path. Do not include code style issues, gas optimizations, or theoretical concerns that don't present actual exploitable attack vectors.
`;

  return await callAnthropicAPI(prompt, `You are an expert ${language} security auditor specializing in identifying exploitable vulnerabilities. For each vulnerability, you must assign a confidence rating from 1-5 based on how certain you are that it's a real, exploitable issue.`);
}

/**
 * Helper function to call the Anthropic API
 * @param {string} prompt - The prompt to send to Claude
 * @param {string} systemPrompt - The system prompt to guide Claude
 * @returns {string} - The response text
 */
async function callAnthropicAPI(prompt, systemPrompt) {
  // Check if API key is available
  if (!process.env.ANTHROPIC_API_KEY) {
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
      system: systemPrompt
    });

    // Validate response format
    if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
      throw new Error('Invalid response format from Anthropic API');
    }

    return response.content[0].text;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

module.exports = {
  analyzeSmartContract,
  analyzeCodebase,
  analyzeSolidityContract,
  analyzeRustContract,
  explainCode
}; 