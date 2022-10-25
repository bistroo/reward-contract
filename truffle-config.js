const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const infuraKey = fs.readFileSync(".infura").toString().trim(); // infura key
const mnemonic = fs.readFileSync(".secret").toString().trim(); // contains mnemonic
const etherscan = fs.readFileSync(".etherscan").toString().trim(); // infura key
 
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*"        // Any network (default: none)
    },
    goerli: {
      provider: () => new HDWalletProvider(mnemonic, `https://goerli.infura.io/v3/${infuraKey}`),
      network_id: 5,       
      gas: 5500000,   
      skipDryRun: true
    },
    'goerli-update': {
      provider: () => new HDWalletProvider(mnemonic, `https://goerli.infura.io/v3/${infuraKey}`),         //provider:   Nonce,
      network_id: 5,       // rinkeby id
      gas: 5500000,
      skipDryRun: true
    },
    'goerli-test': {
      provider: () => new HDWalletProvider(mnemonic, `https://goerli.infura.io/v3/${infuraKey}`),
      network_id: 5,        
      gas: 5500000,        
      // confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      // timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
  },
  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.7",    // Fetch exact version from solc-bin (default: truffle's version)
      docker: false,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: false,
          runs: 200
        },
        evmVersion: "constantinople"
      }
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],  
  api_keys: {
    etherscan: etherscan
  }
}
 
 