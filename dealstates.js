export let dealstates = [
  // go-fil-markets/storagemarket/types.go
  'Unknown', // 0
  'ProposalNotFound', // 1
  'ProposalRejected', // 2
  'ProposalAccepted', // 3
  'Staged', // 4
  'Sealing', // 5
  'Active', // 6
  'Failing', // 7
  'NotFound', // 8

  // Internal
  'FundsEnsured', // 9 Deposited funds as neccesary to create a deal, ready to move forward
  'Validating', // 10 Verifying that deal parameters are good
  'Transferring', // 11 Moving data
  'WaitingForData', // 12 Manual transfer
  'VerifyData', // 13 Verify transferred data - generate CAR / piece data
  'EnsureProviderFunds', // 14 Ensuring that provider collateral is sufficient
  'EnsureClientFunds', // 15 Ensuring that client funds are sufficient
  'ProviderFunding', // 16 Waiting for funds to appear in Provider balance
  'ClientFunding', // 17 Waiting for funds to appear in Client balance
  'Publish', // 18 Publishing deal to chain
  'Publishing', // 19 Waiting for deal to appear on chain
  'Error', // 20 deal failed with an unexpected error
  'Completed' // 21 on provider side, indicates deal is active and info for retrieval is recorded
]

export let terminalStates = new Set([
  // go-fil-markets/storagemarket/types.go
  1, // StorageDealProposalNotFound
  2, // StorageDealProposalRejected
  8, // StorageDealNotFound
  20, // StorageDealError
  21 // StorageDealCompleted
])