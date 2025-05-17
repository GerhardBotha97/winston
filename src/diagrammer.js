const fs = require('fs');
const path = require('path');
const graphviz = require('graphviz');
const parser = require('@solidity-parser/parser');
const ora = require('ora');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generates a diagram of the smart contract code
 * @param {string} filePath - Path to the smart contract file
 * @param {string} outputDir - Directory to save diagram results
 */
async function generateDiagram(filePath, outputDir) {
  const spinner = ora('Generating contract diagram...').start();
  
  try {
    // Read the contract code
    const contractCode = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // First approach: Generate DOT diagram using GraphViz
    try {
      const dotGraph = generateDotDiagram(contractCode);
      const dotOutputPath = path.join(outputDir, `${fileName}.dot`);
      fs.writeFileSync(dotOutputPath, dotGraph);
    } catch (dotError) {
      console.error('Error generating dot diagram:', dotError);
      // Create a simple fallback diagram if the main one fails
      const fallbackDot = `digraph G {\n  label="Contract: ${fileName}";\n  node [shape=box];\n  "${fileName}" [fillcolor=lightblue, style=filled];\n}`;
      const dotOutputPath = path.join(outputDir, `${fileName}.dot`);
      fs.writeFileSync(dotOutputPath, fallbackDot);
    }
    
    // Second approach: Use Claude 3.7 to create a mermaid diagram
    try {
      const mermaidDiagram = await generateMermaidDiagram(contractCode);
      const mermaidOutputPath = path.join(outputDir, `${fileName}.mermaid.md`);
      fs.writeFileSync(mermaidOutputPath, mermaidDiagram);
    } catch (mermaidError) {
      console.error('Error generating mermaid diagram:', mermaidError);
      // Create a simple fallback mermaid diagram
      const fallbackMermaid = `# Contract Diagram\n\`\`\`mermaid\nclassDiagram\n  class ${fileName} {\n    +Contract Structure: Failed to generate\n  }\n\`\`\``;
      const mermaidOutputPath = path.join(outputDir, `${fileName}.mermaid.md`);
      fs.writeFileSync(mermaidOutputPath, fallbackMermaid);
    }
    
    spinner.succeed(`Diagrams generated! Saved to:\n- ${path.join(outputDir, `${fileName}.dot`)}\n- ${path.join(outputDir, `${fileName}.mermaid.md`)}`);
    return { dotOutputPath: path.join(outputDir, `${fileName}.dot`), mermaidOutputPath: path.join(outputDir, `${fileName}.mermaid.md`) };
    
  } catch (error) {
    spinner.fail('Diagram generation failed');
    throw error;
  }
}

/**
 * Generates a DOT diagram of the contract using GraphViz
 * @param {string} contractCode - Source code of the contract
 * @returns {string} - DOT graph representation
 */
function generateDotDiagram(contractCode) {
  // Parse the contract
  const ast = parser.parse(contractCode, { loc: true });
  
  // Create a new graph
  const g = graphviz.graph("G");
  
  // Process all contract definitions
  const contractNodes = [];
  parser.visit(ast, {
    ContractDefinition: function(node) {
      contractNodes.push(node);
    }
  });
  
  // Add contract nodes
  contractNodes.forEach(contract => {
    const contractNode = g.addNode(contract.name, {
      shape: "box",
      style: "filled",
      fillcolor: "lightblue",
      fontname: "Arial Bold"
    });
    
    // Add function nodes
    const funcNodes = [];
    const stateVars = [];
    
    parser.visit(contract, {
      FunctionDefinition: function(node) {
        funcNodes.push(node);
      },
      StateVariableDeclaration: function(node) {
        stateVars.push(node);
      }
    });
    
    funcNodes.forEach(func => {
      const funcName = func.name || (func.isConstructor ? "constructor" : "fallback/receive");
      const visibility = func.visibility || "default";
      const stateMutability = func.stateMutability || "non-payable";
      
      const funcNodeName = `${contract.name}_${funcName}`;
      const funcNode = g.addNode(funcNodeName, {
        label: `${funcName}(${visibility})`,
        shape: "ellipse",
        style: func.isConstructor ? "filled" : "solid",
        fillcolor: func.isConstructor ? "lightgreen" : "white"
      });
      
      // Connect contract to function
      g.addEdge(contract.name, funcNodeName);
      
      // Add function modifiers
      if (func.modifiers) {
        func.modifiers.forEach(modifier => {
          const modName = `${contract.name}_mod_${modifier.name}`;
          const modNode = g.addNode(modName, {
            label: `modifier: ${modifier.name}`,
            shape: "hexagon",
            style: "filled",
            fillcolor: "lightyellow"
          });
          g.addEdge(funcNodeName, modName);
        });
      }
    });
    
    // Add state variables
    stateVars.forEach((stateVarDecl) => {
      stateVarDecl.variables.forEach(stateVar => {
        let typeName = "unknown";
        if (stateVar.typeName) {
          if (stateVar.typeName.name) {
            typeName = stateVar.typeName.name;
          } else if (stateVar.typeName.type === 'ElementaryTypeName') {
            typeName = stateVar.typeName.name;
          }
        }
        
        const stateVarNodeName = `${contract.name}_state_${stateVar.name}`;
        const stateVarNode = g.addNode(stateVarNodeName, {
          label: `${stateVar.name}: ${typeName}`,
          shape: "box",
          style: "rounded,filled",
          fillcolor: "lightgrey"
        });
        g.addEdge(contract.name, stateVarNodeName, { style: "dashed" });
      });
    });
    
    // Add inheritance edges
    if (contract.baseContracts) {
      contract.baseContracts.forEach(base => {
        let baseName = "";
        if (typeof base.baseName === 'string') {
          baseName = base.baseName;
        } else if (base.baseName.namePath) {
          baseName = base.baseName.namePath;
        } else {
          baseName = "Unknown";
        }
        
        g.addEdge(contract.name, baseName, {
          style: "bold",
          label: "inherits",
          fontname: "Arial Italic",
          fontsize: 10
        });
      });
    }
  });
  
  // Export DOT graph as string
  return g.to_dot();
}

/**
 * Generates a mermaid diagram using Claude 3.7
 * @param {string} contractCode - Source code of the contract
 * @returns {string} - Mermaid markdown diagram
 */
async function generateMermaidDiagram(contractCode) {
  try {
    // Prompt for Claude 3.7
    const prompt = `
Analyze the following smart contract and create a detailed Mermaid diagram that visually represents:
1. Contract inheritance hierarchy
2. Functions (including visibility and modifiers)
3. State variables
4. Function call flows
5. Access control relationships
6. External contract interactions

Smart Contract:
\`\`\`solidity
${contractCode}
\`\`\`

Return a thorough diagram that captures the functionality and relationships. Use class diagrams for structure and sequence or flowcharts for interactions.
The output should be a valid Mermaid diagram within markdown format.

Format your response like this:
# Contract Diagram
\`\`\`mermaid
<mermaid diagram code here>
\`\`\`

# Interaction Flow
\`\`\`mermaid
<interaction mermaid diagram code here>
\`\`\`
`;

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Warning: ANTHROPIC_API_KEY not found in environment variables');
      return "# No API Key Available\nMermaid diagram generation requires an Anthropic API key.";
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
        system: "You are an expert smart contract diagramming assistant. Generate comprehensive, correct mermaid diagrams that accurately represent contract code structure and logic."
      });

      if (response && response.content && Array.isArray(response.content) && response.content.length > 0) {
        return response.content[0].text;
      } else {
        console.error('Invalid response format from Anthropic API:', response);
        return "# Error in API Response\nUnable to create mermaid diagram due to an invalid API response format.";
      }
    } catch (apiError) {
      console.error('API call error:', apiError);
      return "# API Call Error\nUnable to create mermaid diagram due to an API call error.";
    }
  } catch (error) {
    console.error('Error generating mermaid diagram:', error);
    return "# Error generating diagram\nUnable to create mermaid diagram.";
  }
}

module.exports = {
  generateDiagram
}; 