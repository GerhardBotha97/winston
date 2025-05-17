const fs = require('fs-extra');
const path = require('path');
const { simpleGit } = require('simple-git');
const ora = require('ora');
const chalk = require('chalk');
const axios = require('axios');

/**
 * Checks if a path is a git repository URL
 * @param {string} input - The input path or URL
 * @param {Object} options - Additional options
 * @returns {boolean} - True if the input is a git repository URL
 */
function isGitUrl(input, options = {}) {
  // If the forceGit flag is set, treat it as a git repo
  if (options.forceGit) {
    return true;
  }
  
  // Check for more specific git URL patterns
  return (
    input.startsWith('git@') ||
    input.startsWith('git://') ||
    input.endsWith('.git') ||
    // GitHub, GitLab, Bitbucket repo URLs that don't end with raw file extensions
    (
      (input.includes('github.com/') || 
       input.includes('gitlab.com/') || 
       input.includes('bitbucket.org/')) && 
      !input.match(/\.(sol|rs|txt|json|js|md)$/)
    )
  );
}

/**
 * Clone a git repository to a temporary directory
 * @param {string} repoUrl - The URL of the repository to clone
 * @returns {Promise<string>} - Path to the cloned repository
 */
async function cloneRepository(repoUrl) {
  const spinner = ora(`Cloning repository: ${repoUrl}`).start();
  
  try {
    // Create a temporary directory for the repository
    const tempDir = path.join(process.cwd(), 'temp_repos', path.basename(repoUrl, '.git'));
    
    // Ensure the directory exists and is empty
    await fs.ensureDir(tempDir);
    await fs.emptyDir(tempDir);
    
    // Clone the repository
    const git = simpleGit();
    await git.clone(repoUrl, tempDir);
    
    spinner.succeed(`Repository cloned to: ${tempDir}`);
    return tempDir;
  } catch (error) {
    spinner.fail(`Failed to clone repository: ${error.message}`);
    throw error;
  }
}

/**
 * Find all Solidity files in a directory (recursively)
 * @param {string} dirPath - The directory to search
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findSolidityFiles(dirPath) {
  const spinner = ora(`Finding Solidity files in: ${dirPath}`).start();
  
  try {
    const solidityFiles = [];
    
    // Walk through the directory recursively
    async function walk(dir) {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          // Recursively walk subdirectories
          await walk(filePath);
        } else if (file.endsWith('.sol')) {
          // Add Solidity files to the list
          solidityFiles.push(filePath);
        }
      }
    }
    
    await walk(dirPath);
    
    spinner.succeed(`Found ${solidityFiles.length} Solidity files`);
    return solidityFiles;
  } catch (error) {
    spinner.fail(`Failed to find Solidity files: ${error.message}`);
    throw error;
  }
}

/**
 * Find all Rust files in a directory (recursively)
 * @param {string} dirPath - The directory to search
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findRustFiles(dirPath) {
  const spinner = ora(`Finding Rust files in: ${dirPath}`).start();
  
  try {
    const rustFiles = [];
    
    // Walk through the directory recursively
    async function walk(dir) {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'target') {
          // Recursively walk subdirectories, excluding Rust build directories
          await walk(filePath);
        } else if (file.endsWith('.rs')) {
          // Add Rust files to the list
          rustFiles.push(filePath);
        }
      }
    }
    
    await walk(dirPath);
    
    spinner.succeed(`Found ${rustFiles.length} Rust files`);
    return rustFiles;
  } catch (error) {
    spinner.fail(`Failed to find Rust files: ${error.message}`);
    throw error;
  }
}

/**
 * Download a smart contract file from a URL
 * @param {string} url - The URL to download the contract from
 * @returns {Promise<string>} - Path to the downloaded file
 */
async function downloadContract(url) {
  const spinner = ora(`Downloading contract from: ${url}`).start();
  
  try {
    // Create a temporary directory for downloaded files
    const tempDir = path.join(process.cwd(), 'temp_repos', 'downloads');
    await fs.ensureDir(tempDir);
    
    // Generate a filename based on the URL
    const filename = path.basename(url).split('?')[0] || 'downloadedContract.sol';
    const filePath = path.join(tempDir, filename);
    
    // Download the file
    const response = await axios.get(url);
    await fs.writeFile(filePath, response.data);
    
    spinner.succeed(`Contract downloaded to: ${filePath}`);
    return filePath;
  } catch (error) {
    spinner.fail(`Failed to download contract: ${error.message}`);
    throw error;
  }
}

/**
 * Check if the input is a URL to a downloadable file
 * @param {string} input - The input URL
 * @returns {boolean} - True if the input appears to be a downloadable URL
 */
function isDownloadUrl(input) {
  return (
    (input.startsWith('http://') || input.startsWith('https://')) &&
    !input.endsWith('.git')
  );
}

/**
 * Process an input which can be a file, directory, or git repository
 * @param {string} input - File path, directory path, or git URL
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Object with file paths to process
 */
async function processInput(input, options) {
  try {
    let inputPath = input;
    let isSolidity = false;
    let isRust = false;
    
    // First check if the input is a downloadable URL - prioritize download for URLs
    if (isDownloadUrl(input)) {
      console.log(chalk.blue(`Input appears to be a downloadable URL`));
      
      // Only check if it's a git URL if not a direct file URL
      if (isGitUrl(input, options) && !input.match(/\.(sol|rs|txt|json|js|md)$/)) {
        console.log(chalk.blue(`URL appears to be a git repository, cloning...`));
        inputPath = await cloneRepository(input);
      } else {
        // Otherwise try to download the file directly
        inputPath = await downloadContract(input);
        
        // Check file extension
        if (inputPath.endsWith('.sol')) {
          console.log(chalk.blue(`Downloaded Solidity file: ${inputPath}`));
          isSolidity = true;
          return { 
            solidityFiles: [inputPath],
            rustFiles: []
          };
        } else if (inputPath.endsWith('.rs')) {
          console.log(chalk.blue(`Downloaded Rust file: ${inputPath}`));
          isRust = true;
          return {
            solidityFiles: [],
            rustFiles: [inputPath]
          };
        }
      }
    } else {
      // Check file extension for direct file input
      if (input.endsWith('.sol')) {
        console.log(chalk.blue(`Processing single Solidity file: ${input}`));
        isSolidity = true;
        return { 
          solidityFiles: [input],
          rustFiles: []
        };
      } else if (input.endsWith('.rs')) {
        console.log(chalk.blue(`Processing single Rust file: ${input}`));
        isRust = true;
        return {
          solidityFiles: [],
          rustFiles: [input]
        };
      }
    }
    
    // Check if the input is a directory
    const stat = await fs.stat(inputPath);
    if (stat.isDirectory()) {
      console.log(chalk.blue(`Input is a directory, searching for Solidity and Rust files`));
      const solidityFiles = await findSolidityFiles(inputPath);
      const rustFiles = await findRustFiles(inputPath);
      
      return {
        solidityFiles,
        rustFiles
      };
    }
    
    console.warn(chalk.yellow(`Warning: Input is not a Solidity or Rust file, directory, or git repository`));
    return {
      solidityFiles: [],
      rustFiles: []
    };
  } catch (error) {
    console.error(chalk.red(`Error processing input: ${error.message}`));
    return {
      solidityFiles: [],
      rustFiles: []
    };
  }
}

module.exports = {
  isGitUrl,
  isDownloadUrl,
  cloneRepository,
  downloadContract,
  findSolidityFiles,
  findRustFiles,
  processInput
}; 