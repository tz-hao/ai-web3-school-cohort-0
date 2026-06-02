# Sponsor / Mentor Questions - SafePay Guard Wallet

## Product Direction

1. Is "agent wallet safe execution" a clear enough hackathon problem statement?
2. Should the MVP focus on x402 paid API calls, LI.FI bridge quotes, or Safe transaction review first?
3. Which user is most compelling for judging: individual Web3 user, DAO treasury operator, or wallet builder?
4. Is a policy decision engine enough for MVP, or should there be a UI?

## Safe / Wallet Infrastructure

1. What is the best way to represent a Safe transaction draft without executing it?
2. Are Safe guards the right layer for these checks, or should checks live in modules / app layer first?
3. What guard failure or recovery patterns should we avoid?
4. How should revocation be demonstrated in a hackathon demo?
5. Is ERC-4337 UserOperation review a better demo than direct Safe transaction review?

## x402 / Payment

1. What x402 fields should be treated as mandatory policy facts?
2. Should resource matching be exact URL matching, domain allowlist, or signed resource descriptor?
3. How should settlement receipt be stored for audit?
4. Is it acceptable for hackathon MVP to use mock settlement if the policy flow is real?

## LI.FI / Cross-chain Execution

1. Which LI.FI quote fields are most important for wallet policy?
2. How should SafePay evaluate bridge/swap slippage?
3. Should recipient, integrator, route tool, or bridge be allowlisted?
4. What are the common failure statuses that should trigger human confirmation?
5. Should the demo use a real quote API call but stop before signing?

## AI Safety

1. What are the most realistic prompt injection attacks in agent wallet workflows?
2. Should AI risk explanation be generated before or after deterministic policy checks?
3. How do we prevent users from over-trusting the AI summary?
4. What raw facts should always be shown next to AI explanation?

## CAW / Pact / Server Wallet

1. What is the cleanest way to model a Pact policy for the demo?
2. Should policy be enforced at the agent layer, signer layer, or both?
3. How should a server wallet prove that it used the intended policy?
4. What audit events should be mandatory?

## Judging / Demo

1. Is a CLI demo acceptable, or should there be a visual policy decision UI?
2. Which three scenarios would best show the value?
   - normal low-risk payment
   - oversized payment blocked
   - LI.FI quote requires confirmation
3. Should the final demo emphasize product UX or protocol architecture?
4. What would make this project feel sponsor-relevant rather than generic?

