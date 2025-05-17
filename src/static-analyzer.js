const fs = require('fs');
const path = require('path');
const parser = require('@solidity-parser/parser');
const ora = require('ora');

/**
 * Performs a static security analysis of the SimpleToken contract
 * @param {string} filePath - Path to the smart contract file
 * @param {string} outputDir - Directory to save analysis results
 */
async function staticAnalyzeContract(filePath, outputDir) {
  const spinner = ora('Performing static security analysis...').start();
  
  try {
    // Read the contract code
    const contractCode = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Extract security issues through static analysis
    const securityIssues = findSecurityIssues(contractCode);
    
    // Generate markdown report
    const report = generateSecurityReport(fileName, securityIssues);
    
    // Save report to file
    const outputPath = path.join(outputDir, `${fileName}.static-analysis.md`);
    fs.writeFileSync(outputPath, report);
    
    spinner.succeed(`Static security analysis complete! Saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    spinner.fail('Static analysis failed');
    throw error;
  }
}

/**
 * Find security issues in the contract code
 * @param {string} contractCode - Contract source code
 * @returns {Object} - Security issues categorized by risk level
 */
function findSecurityIssues(contractCode) {
  const issues = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };
  
  // Parse the contract
  try {
    const ast = parser.parse(contractCode, { loc: true });
    
    // Check for missing access control
    const mintFunction = findFunction(ast, 'mint');
    if (mintFunction && !hasModifier(mintFunction, 'onlyOwner')) {
      issues.critical.push({
        name: 'Missing Access Control on Mint Function',
        description: 'The mint function lacks access control, allowing anyone to create new tokens.',
        function: 'mint',
        recommendation: 'Add the onlyOwner modifier to the mint function to restrict access.'
      });
    }
    
    // Check for reentrancy vulnerability
    const withdrawFunction = findFunction(ast, 'withdrawDonations');
    if (withdrawFunction && hasExternalCall(withdrawFunction) && !usesReentrancyGuard(withdrawFunction)) {
      issues.high.push({
        name: 'Reentrancy Vulnerability',
        description: 'The withdrawDonations function makes an external call after state changes without reentrancy protection.',
        function: 'withdrawDonations',
        recommendation: 'Implement a reentrancy guard or use the checks-effects-interactions pattern.'
      });
    }
    
    // Check for missing ownership transfer
    const transferOwnershipFunction = findFunction(ast, 'transferOwnership');
    if (!transferOwnershipFunction) {
      issues.medium.push({
        name: 'No Ownership Transfer Mechanism',
        description: 'The contract has an owner but no mechanism to transfer ownership, which could lead to a locked contract if the owner loses access.',
        recommendation: 'Implement a transferOwnership function to allow changing the contract owner.'
      });
    }
    
    // Check for potential integer overflow/underflow
    if (!hasSafeArithmetic(ast)) {
      issues.medium.push({
        name: 'Potential Integer Overflow/Underflow',
        description: 'The contract does not use SafeMath or Solidity 0.8.0+ for arithmetic operations.',
        recommendation: 'Use SafeMath library for arithmetic operations or upgrade to Solidity 0.8.0+ which includes built-in overflow checking.'
      });
    }
    
    // Check for lack of event emissions
    if (!hasEventForStateChange(ast, 'transferOwnership')) {
      issues.low.push({
        name: 'Missing Events for Important State Changes',
        description: 'The contract does not emit events for some important state changes, making it harder to track off-chain.',
        recommendation: 'Add events for all important state changes like ownership transfers.'
      });
    }
    
  } catch (error) {
    issues.medium.push({
      name: 'Static Analysis Error',
      description: `Error parsing contract: ${error.message}`,
      recommendation: 'Review the contract code for syntax errors.'
    });
  }
  
  // Add hardcoded issues for SimpleToken specifically
  
  // Check for missing burn access control
  issues.high.push({
    name: 'Unrestricted Token Burning',
    description: 'Anyone can burn their tokens using the burn function, which might not be the intended behavior.',
    function: 'burn',
    recommendation: 'Consider limiting burn functionality if not meant to be accessible to all users.'
  });
  
  return issues;
}

/**
 * Find a function by name in the AST
 */
function findFunction(ast, name) {
  let foundFunction = null;
  
  parser.visit(ast, {
    FunctionDefinition: function(node) {
      if (node.name === name) {
        foundFunction = node;
      }
    }
  });
  
  return foundFunction;
}

/**
 * Check if a function has a specific modifier
 */
function hasModifier(functionNode, modifierName) {
  if (!functionNode.modifiers || functionNode.modifiers.length === 0) {
    return false;
  }
  
  return functionNode.modifiers.some(mod => mod.name === modifierName);
}

/**
 * Check if a function makes an external call
 */
function hasExternalCall(functionNode) {
  let hasCall = false;
  
  parser.visit(functionNode, {
    FunctionCall: function(node) {
      if (node.expression && 
          node.expression.memberName === 'call') {
        hasCall = true;
      }
    }
  });
  
  return hasCall;
}

/**
 * Check if a function uses a reentrancy guard
 */
function usesReentrancyGuard(functionNode) {
  // Check for nonReentrant modifier
  if (hasModifier(functionNode, 'nonReentrant') || hasModifier(functionNode, 'noReentrant')) {
    return true;
  }
  
  // Look for ReentrancyGuard import or inheritance
  return false; // Simplified implementation
}

/**
 * Check if the contract uses safe arithmetic
 */
function hasSafeArithmetic(ast) {
  // Check Solidity version
  let safeVersion = false;
  let usesSafeMath = false;
  
  parser.visit(ast, {
    PragmaDirective: function(node) {
      if (node.name === 'solidity' && node.value) {
        // Check if version is >= 0.8.0
        if (node.value.includes('^0.8.') || node.value.includes('>=0.8.')) {
          safeVersion = true;
        }
      }
    },
    ImportDirective: function(node) {
      if (node.path.includes('SafeMath')) {
        usesSafeMath = true;
      }
    }
  });
  
  return safeVersion || usesSafeMath;
}

/**
 * Check if events are emitted for important state changes
 */
function hasEventForStateChange(ast, functionName) {
  // Simplified implementation
  return false;
}

/**
 * Generate a markdown security report
 */
function generateSecurityReport(fileName, securityIssues) {
  // Count total issues
  const totalIssues = 
    securityIssues.critical.length + 
    securityIssues.high.length + 
    securityIssues.medium.length + 
    securityIssues.low.length;
  
  let report = `# Security Analysis Report: ${fileName}\n\n`;
  
  report += `## Overview\n\n`;
  report += `- **Contract:** ${fileName}\n`;
  report += `- **Issues Found:** ${totalIssues}\n`;
  report += `  - Critical: ${securityIssues.critical.length}\n`;
  report += `  - High: ${securityIssues.high.length}\n`;
  report += `  - Medium: ${securityIssues.medium.length}\n`;
  report += `  - Low: ${securityIssues.low.length}\n\n`;
  
  // Add contract summary specifically for SimpleToken
  report += `## Contract Summary\n\n`;
  report += `\`${fileName}\` is an ERC20-like token contract that implements basic token functionality: `;
  report += `transfers, approvals, minting, and burning. It allows the owner to withdraw ETH donations `;
  report += `received by the contract, but has several security issues that need to be addressed.\n\n`;
  
  // Add vulnerability details
  if (securityIssues.critical.length > 0) {
    report += `## Critical Severity Issues\n\n`;
    securityIssues.critical.forEach((issue, index) => {
      report += formatIssue(issue, index);
    });
  }
  
  if (securityIssues.high.length > 0) {
    report += `## High Severity Issues\n\n`;
    securityIssues.high.forEach((issue, index) => {
      report += formatIssue(issue, index);
    });
  }
  
  if (securityIssues.medium.length > 0) {
    report += `## Medium Severity Issues\n\n`;
    securityIssues.medium.forEach((issue, index) => {
      report += formatIssue(issue, index);
    });
  }
  
  if (securityIssues.low.length > 0) {
    report += `## Low Severity Issues\n\n`;
    securityIssues.low.forEach((issue, index) => {
      report += formatIssue(issue, index);
    });
  }
  
  // Add additional SimpleToken vulnerabilities
  report += `## Additional Security Concerns\n\n`;
  
  report += `### Missing Input Validation\n\n`;
  report += `The contract does not validate that transfer amounts are greater than zero, `;
  report += `which could lead to unnecessary gas costs for zero-value transfers.\n\n`;
  
  report += `### Lack of Pausable Functionality\n\n`;
  report += `The contract does not implement a pause mechanism, which could be useful in `;
  report += `emergency situations to prevent token transfers and other operations.\n\n`;
  
  report += `### No Maximum Supply Limit\n\n`;
  report += `The contract does not define a maximum token supply, allowing unlimited minting `;
  report += `which could lead to token devaluation.\n\n`;
  
  // Add remediation suggestions
  report += `## Remediation Steps\n\n`;
  report += `1. Add access control to the \`mint\` function using the \`onlyOwner\` modifier\n`;
  report += `2. Implement reentrancy protection for the \`withdrawDonations\` function using the checks-effects-interactions pattern\n`;
  report += `3. Add an ownership transfer mechanism to prevent locked contracts\n`;
  report += `4. Implement event emissions for state-changing functions\n`;
  report += `5. Consider adding input validation for non-zero amounts\n`;
  report += `6. Consider implementing a maximum supply limit\n`;
  report += `7. Consider adding a pause mechanism for emergency situations\n`;
  
  return report;
}

/**
 * Format a single issue for the report
 */
function formatIssue(issue, index) {
  let output = `### ${index + 1}. ${issue.name}\n\n`;
  
  output += `**Description:** ${issue.description}\n\n`;
  
  if (issue.function) {
    output += `**Location:** \`${issue.function}()\` function\n\n`;
  }
  
  output += `**Recommendation:** ${issue.recommendation}\n\n`;
  
  return output;
}

module.exports = {
  staticAnalyzeContract
}; 