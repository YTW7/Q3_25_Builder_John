use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Invalid amount: Amount must be greater than 0")]
    InvalidAmount,

    #[msg("Insufficient funds in vault")]
    InsufficientFunds,

    #[msg("Insufficient funds in user account ")]
    InsufficientUserBalance,
}