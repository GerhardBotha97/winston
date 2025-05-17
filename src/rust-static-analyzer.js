const fs = require('fs');
const path = require('path');
const ora = require('ora');

/**
 * Perform static analysis on Rust code to find potential issues
 * @param {string} filePath - Path to the Rust file
 * @param {string} outputDir - Directory to save analysis results
 */
async function staticAnalyzeRustContract(filePath, outputDir) {
  const spinner = ora('Performing static analysis on Rust code...').start();
  
  try {
    // Read the Rust code
    const code = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Results object to hold findings
    const findings = {
      high: [],
      medium: [],
      low: [],
      info: []
    };
    
    // Perform static analysis checks
    
    // 1. Check for unsafe blocks - potential memory safety issues
    if (code.includes('unsafe')) {
      findings.high.push({
        title: 'Unsafe Block Usage',
        description: 'Unsafe blocks bypass Rust safety guarantees and may lead to undefined behavior, memory corruption, or security vulnerabilities.',
        recommendation: 'Review all unsafe code carefully. Consider if safe alternatives exist. If unsafe is necessary, add detailed comments explaining why and what invariants are being maintained.'
      });
    }
    
    // 2. Check for unwrap/expect without error handling - potential panics
    const unwrapPattern = /\.unwrap\(\)/g;
    const expectPattern = /\.expect\([^)]+\)/g;
    
    if (unwrapPattern.test(code)) {
      findings.medium.push({
        title: 'Unwrap on Option/Result',
        description: 'Use of unwrap() can cause panics if the Option is None or the Result is an Err. This can lead to crashes in production.',
        recommendation: 'Use proper error handling with match, if let, or the ? operator instead of unwrap().'
      });
    }
    
    if (expectPattern.test(code)) {
      findings.low.push({
        title: 'Expect on Option/Result',
        description: 'The expect() method will panic with a custom message if the value is None or Err. While better than unwrap(), it still causes crashes.',
        recommendation: 'Use proper error handling with match, if let, or the ? operator instead of expect().'
      });
    }
    
    // 3. Check for potential integer overflow
    if (code.includes('u64') || code.includes('u32') || code.includes('u16') || code.includes('u8')) {
      if (code.includes('+') || code.includes('+=')) {
        findings.medium.push({
          title: 'Potential Integer Overflow',
          description: 'Arithmetic operations on unsigned integers can overflow in Rust\'s release mode without checks, which may lead to incorrect calculations.',
          recommendation: 'Use checked_add(), saturating_add(), or wrapping_add() methods based on your requirements to handle overflow cases explicitly.'
        });
      }
    }
    
    // 4. Check for suspicious authorization patterns
    if (code.includes('owner') && code.includes('caller')) {
      const basicAuthCheck = /if\s+([a-zA-Z0-9_]+)\s*!=\s*self\.owner/;
      
      if (basicAuthCheck.test(code)) {
        findings.info.push({
          title: 'Basic Authorization Check',
          description: 'The code implements a basic ownership check, which may be sufficient for simple contracts but lacks flexibility for more complex authorization requirements.',
          recommendation: 'Consider implementing a more sophisticated access control system for complex applications, such as role-based access control or multi-signature authorization.'
        });
      }
    }
    
    // 5. Check for error swallowing (ignoring errors with let _ = ...)
    const ignoredErrorPattern = /let\s+_\s*=\s*.*\)\s*;/g;
    if (ignoredErrorPattern.test(code)) {
      findings.low.push({
        title: 'Ignored Error Results',
        description: 'The code ignores error results by using let _ = ... pattern, which may hide failed operations and make debugging difficult.',
        recommendation: 'Handle all errors properly or document explicitly why certain errors are safe to ignore.'
      });
    }
    
    // 6. Check for use of HashMap without considerations for DOS attacks
    if (code.includes('HashMap') && !code.includes('with_capacity')) {
      findings.low.push({
        title: 'HashMap Without Capacity Hint',
        description: 'Using HashMap without capacity hints could lead to performance degradation with many insertions and potential DOS vulnerabilities.',
        recommendation: 'Use HashMap::with_capacity() to pre-allocate space when you know the approximate size in advance.'
      });
    }
    
    // Generate the report
    let report = `# Static Analysis Report: ${fileName}\n\n`;
    report += `*Generated on: ${new Date().toISOString()}*\n\n`;
    
    // Add findings to the report
    report += `## Results Summary\n\n`;
    report += `- High severity issues: ${findings.high.length}\n`;
    report += `- Medium severity issues: ${findings.medium.length}\n`;
    report += `- Low severity issues: ${findings.low.length}\n`;
    report += `- Informational: ${findings.info.length}\n\n`;
    
    // High severity findings
    if (findings.high.length > 0) {
      report += `## High Severity Issues\n\n`;
      findings.high.forEach((finding, index) => {
        report += `### ${index + 1}. ${finding.title}\n\n`;
        report += `**Description:** ${finding.description}\n\n`;
        report += `**Recommendation:** ${finding.recommendation}\n\n`;
      });
    }
    
    // Medium severity findings
    if (findings.medium.length > 0) {
      report += `## Medium Severity Issues\n\n`;
      findings.medium.forEach((finding, index) => {
        report += `### ${index + 1}. ${finding.title}\n\n`;
        report += `**Description:** ${finding.description}\n\n`;
        report += `**Recommendation:** ${finding.recommendation}\n\n`;
      });
    }
    
    // Low severity findings
    if (findings.low.length > 0) {
      report += `## Low Severity Issues\n\n`;
      findings.low.forEach((finding, index) => {
        report += `### ${index + 1}. ${finding.title}\n\n`;
        report += `**Description:** ${finding.description}\n\n`;
        report += `**Recommendation:** ${finding.recommendation}\n\n`;
      });
    }
    
    // Informational findings
    if (findings.info.length > 0) {
      report += `## Informational\n\n`;
      findings.info.forEach((finding, index) => {
        report += `### ${index + 1}. ${finding.title}\n\n`;
        report += `**Description:** ${finding.description}\n\n`;
        report += `**Recommendation:** ${finding.recommendation}\n\n`;
      });
    }
    
    // Additional notes
    report += `## Additional Notes\n\n`;
    report += `This is an automated analysis and may contain false positives. Manual review is still recommended.\n`;
    report += `Consider using tools like 'cargo audit' and 'cargo deny' for dependency security checks.\n`;
    
    // Save the report
    const outputPath = path.join(outputDir, `${fileName}.rust-static-analysis.md`);
    fs.writeFileSync(outputPath, report);
    
    spinner.succeed(`Rust static analysis complete! Saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    spinner.fail('Static analysis failed');
    throw error;
  }
}

module.exports = {
  staticAnalyzeRustContract
}; 