# Bistroo Reward Contract
Referral rewards for Bistroo consumers referring new consumers or merchants (referrals).
We have visualised the process in the schematic and applications design below.

## Process flow

###### Roles:
* Referrer: Consumer who refers a referral to activate a Bistroo account
* Referral: A potential new consumer or merchant

###### Process
1. The referrer gets and shares a referrer link with a referral
2. The referral clicks on the link and registers the reference by signing a message
3. The referral activates the reward by performing a required activity:
   * A referral consumer registers and pays for an order
   * A referral merchant activates a store
4. The referrer receives a referrer reward


![Reward schematic](https://github.com/bistroo/reward-contract/blob/main/images/reward-schematic.png)
![Reward application design](https://github.com/bistroo/reward-contract/blob/main/images/reward-application-design.png)

# Installation

## Installing the test enviroment
* run `npm install` to install web3, openzeppelin and truffle libraries

In order to use the truffle-config.js file:
* create .infura file containing infura project ID for using Infura Web3 api
* create .secret file containing mnemonics for creating a specific token owner account
* create .etherscan file etherscan key

# Test and deployment

## On local ganache
open a terminal window
run ganache cli with custom config in this terminal window
```
./start-ganache.sh
```
### Test smart contracts
run ganache cli
open a terminal window
Run test script:
```
truffle test ./test/BistrooToken.js
truffle test ./test/BistrooReward.js
```
Known issue with older Truffle version and Babel: `npm install -g babel-runtime`
### Deploy smart contracts
```
npm run migrate-ganache
```
## On Rinkeby
Deploy only the escrow contract on Rinkeby:
```
npm run migrate-rinkeby-update
```
Deploy both contracts on Rinkeby:
```
npm run migrate-rinkeby
```
