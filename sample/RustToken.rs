use std::collections::HashMap;

// A simple token implementation in Rust for blockchain
struct Token {
    name: String,
    symbol: String,
    total_supply: u64,
    balances: HashMap<String, u64>,
    owner: String,
}

impl Token {
    // Constructor to create a new token
    fn new(name: String, symbol: String, initial_supply: u64, owner: String) -> Self {
        let mut balances = HashMap::new();
        balances.insert(owner.clone(), initial_supply);
        
        Token {
            name,
            symbol,
            total_supply: initial_supply,
            balances,
            owner,
        }
    }
    
    // Transfer tokens from sender to recipient
    fn transfer(&mut self, sender: &str, recipient: &str, amount: u64) -> Result<(), &'static str> {
        // Check if sender has enough balance
        let sender_balance = self.balances.get(sender).unwrap_or(&0);
        if *sender_balance < amount {
            return Err("Insufficient balance");
        }
        
        // Update balances
        *self.balances.entry(sender.to_string()).or_insert(0) -= amount;
        *self.balances.entry(recipient.to_string()).or_insert(0) += amount;
        
        Ok(())
    }
    
    // Mint new tokens (only owner can do this)
    fn mint(&mut self, to: &str, amount: u64, caller: &str) -> Result<(), &'static str> {
        if caller != self.owner {
            return Err("Only owner can mint tokens");
        }
        
        // Update balance and total supply
        *self.balances.entry(to.to_string()).or_insert(0) += amount;
        self.total_supply += amount;
        
        Ok(())
    }
    
    // Burn tokens
    fn burn(&mut self, from: &str, amount: u64) -> Result<(), &'static str> {
        // Check if account has enough balance
        let from_balance = self.balances.get(from).unwrap_or(&0);
        if *from_balance < amount {
            return Err("Insufficient balance");
        }
        
        // Update balance and total supply
        *self.balances.entry(from.to_string()).or_insert(0) -= amount;
        self.total_supply -= amount;
        
        Ok(())
    }
    
    // Get balance of an account
    fn balance_of(&self, account: &str) -> u64 {
        *self.balances.get(account).unwrap_or(&0)
    }
    
    // Transfer ownership of the contract
    fn transfer_ownership(&mut self, new_owner: String, caller: &str) -> Result<(), &'static str> {
        if caller != self.owner {
            return Err("Only owner can transfer ownership");
        }
        
        self.owner = new_owner;
        Ok(())
    }
}

// Example usage
fn main() {
    // Create a new token
    let mut token = Token::new(
        "Example Token".to_string(),
        "EXT".to_string(),
        1_000_000,
        "owner_address".to_string(),
    );
    
    // Transfer tokens
    let _ = token.transfer("owner_address", "user1", 1000);
    
    // Mint new tokens
    let _ = token.mint("user2", 500, "owner_address");
    
    // Check balances
    println!("Owner balance: {}", token.balance_of("owner_address"));
    println!("User1 balance: {}", token.balance_of("user1"));
    println!("User2 balance: {}", token.balance_of("user2"));
} 