use anchor_lang::prelude::*;

#[error_code]
pub enum MarketplaceError {
    #[msg("the length for the given name for the marketplace should be between 0 and 32")]
    NameToLong,
}