# Winston Code Explainer Guide

The Winston Code Explainer is a powerful feature that provides detailed function explanations and identifies subtle logic vulnerabilities in your code.

## How It Works

The explainer works in two stages:

1. **Function Analysis**: First, it thoroughly analyzes each function in your code, explaining:
   - Function purpose and business logic
   - Parameters and return values
   - Control flow and state modifications
   - Interactions with other functions/contracts
   - Execution paths and edge cases
   - Data flow between components

2. **Logic Vulnerability Detection**: Next, it uses these detailed explanations to identify potential logic vulnerabilities:
   - Business logic flaws
   - Incorrect assumptions
   - Unhandled edge cases
   - Cross-function vulnerabilities
   - State management issues
   - Access control logic flaws
   - Arithmetic logic errors

All this is done through advanced AI analysis using Claude 3.7, providing insights that go beyond traditional static analysis tools.

## Using the Explainer

### Option 1: Run Explainer Only

```bash
node index.js audit <path-to-file> --explain -o ./output
```

### Option 2: Include as Part of Full Audit

```bash
node index.js audit <path-to-file> -o ./output
```

The detailed function explanations will be saved to `<filename>.explanations.md` and the logic vulnerabilities report will be saved to `<filename>.logic-vulnerabilities.md` in your output directory.

## Example Output

### Function Explanations

The function explanations document provides a deep analysis of each function, including:

```markdown
## Function: transfer(address to, uint256 amount)

### Purpose and Business Logic
This function transfers tokens from the sender's account to the recipient.

### Parameters and Return Values
- `to` (address): The recipient address
- `amount` (uint256): The amount of tokens to transfer
- Returns: Boolean indicating success

### Control Flow Analysis
1. Check if recipient is valid (not zero address)
2. Check if sender has sufficient balance
3. Update balances
4. Emit Transfer event
5. Return success

### State Modifications
- Decreases sender's balance by `amount`
- Increases recipient's balance by `amount`

### Interactions
- Calls `_beforeTokenTransfer` hook if implemented
- Emits `Transfer` event

### Edge Cases
- If `to` is the zero address, transaction will revert
- If sender has insufficient balance, transaction will revert
```

### Logic Vulnerabilities Report

The logic vulnerabilities report identifies potential issues:

```markdown
## Logic Vulnerability: Reentrancy in withdrawDonations Function

**Function**: withdrawDonations()

**Issue**: The function sends ETH to the owner before updating the donation balance,
creating a potential reentrancy vulnerability.

**Exploitation Scenario**: If the owner is a contract with a fallback function that
calls back into withdrawDonations(), it could withdraw funds multiple times before
the balance is updated.

**Fix**: Implement checks-effects-interactions pattern by updating the balance before
making the external call.
```

## Supported Languages

- Solidity (smart contracts)
- Rust (blockchain code)

Each language has specialized analysis tailored to its common security patterns and vulnerabilities. 