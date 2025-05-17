#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const { 
  analyzeSmartContract, 
  analyzeCodebase,
  analyzeSolidityContract, 
  analyzeRustContract,
  explainCode
} = require('./src/analyzer');
const { generateDiagram } = require('./src/diagrammer');
const { generateSemgrepRules } = require('./src/semgrep-generator');
const { staticAnalyzeContract } = require('./src/static-analyzer');
const { generateRustSemgrepRules } = require('./src/rust-semgrep-generator');
const { staticAnalyzeRustContract } = require('./src/rust-static-analyzer');
const { generateRustDiagram } = require('./src/rust-diagrammer');
const { processInput } = require('./src/repo-handler');

console.log(chalk.blue.bold('\n🛡️  WINSTON - Web3 AI Security Auditor 🛡️\n'));

program
  .version('1.0.0')
  .description('Web3 AI Security Auditing Tool powered by Claude 3.7');

program
  .command('audit <input>')
  .description('Run a full security audit on Solidity/Rust contracts (file, directory, or git repository)')
  .option('-d, --diagram', 'Generate code diagram')
  .option('-a, --analysis', 'Generate functionality analysis')
  .option('-s, --semgrep', 'Generate semgrep rules')
  .option('-t, --static', 'Run static analysis')
  .option('-e, --explain', 'Generate detailed function explanations and logic vulnerability analysis')
  .option('-r, --rust', 'Analyze only Rust files')
  .option('-g, --git', 'Treat the input URL as a git repository')
  .option('-o, --output <directory>', 'Output directory for results', './output')
  .action(async (input, options) => {
    try {
      console.log(chalk.yellow(`Processing input: ${input}`));
      
      // Process the input (file, directory, or repository)
      const { solidityFiles, rustFiles } = await processInput(input, { 
        ...options,
        forceGit: options.git // Pass the git flag to processInput
      });
      
      const totalFiles = solidityFiles.length + rustFiles.length;
      if (totalFiles === 0) {
        console.error(chalk.red('No Solidity or Rust files found to analyze'));
        process.exit(1);
      }
      
      console.log(chalk.green(`Found ${solidityFiles.length} Solidity files and ${rustFiles.length} Rust files to analyze`));
      
      // By default, run all analyses if no specific ones are selected
      const runAll = !options.diagram && !options.analysis && !options.semgrep && !options.static && !options.explain;
      
      // Analyze Solidity files
      if (solidityFiles.length > 0 && !options.rust) {
        for (const file of solidityFiles) {
          const filename = path.basename(file);
          console.log(chalk.yellow(`\nAnalyzing contract: ${filename}`));
          
          if (runAll || options.diagram) {
            console.log(chalk.green('🔍 Generating code diagram...'));
            await generateDiagram(file, options.output);
          }
          
          if (runAll || options.analysis) {
            console.log(chalk.green('🔍 Analyzing functionality and business logic...'));
            await analyzeSolidityContract(file, options.output);
          }
          
          if (runAll || options.semgrep) {
            console.log(chalk.green('🔍 Generating semgrep templates...'));
            await generateSemgrepRules(file, options.output);
          }
          
          if (runAll || options.static) {
            console.log(chalk.green('🔍 Performing static security analysis...'));
            await staticAnalyzeContract(file, options.output);
          }
          
          if (runAll || options.explain) {
            console.log(chalk.green('🔍 Generating detailed function explanations and logic vulnerability analysis...'));
            await explainCode(file, options.output, false);
          }
        }
      }
      
      // Analyze Rust files
      if (rustFiles.length > 0) {
        for (const file of rustFiles) {
          const filename = path.basename(file);
          console.log(chalk.yellow(`\nAnalyzing Rust code: ${filename}`));
          
          if (runAll || options.diagram) {
            console.log(chalk.green('🔍 Generating Rust code diagram...'));
            await generateRustDiagram(file, options.output);
          }
          
          if (runAll || options.analysis) {
            console.log(chalk.green('🔍 Analyzing Rust code for security vulnerabilities...'));
            await analyzeRustContract(file, options.output);
          }
          
          if (runAll || options.semgrep) {
            console.log(chalk.green('🔍 Generating Rust semgrep rules...'));
            await generateRustSemgrepRules(file, options.output);
          }
          
          if (runAll || options.static) {
            console.log(chalk.green('🔍 Performing Rust static security analysis...'));
            await staticAnalyzeRustContract(file, options.output);
          }
          
          if (runAll || options.explain) {
            console.log(chalk.green('🔍 Generating detailed function explanations and logic vulnerability analysis...'));
            await explainCode(file, options.output, true);
          }
        }
      }
      
      console.log(chalk.green.bold('\n✅ Audit completed successfully!'));
      console.log(chalk.blue(`Results saved to: ${options.output}`));
    } catch (error) {
      console.error(chalk.red('\n❌ Error during audit:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no commands provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 