// test with ganache-cli instance
const { singletons } = require('@openzeppelin/test-helpers');
const { use } = require('chai');
// https://kalis.me/assert-reverts-solidity-smart-contract-test-truffle/
const truffleAssert = require('truffle-assertions');

const BistrooReward = artifacts.require("BistrooReward");
const BistrooToken = artifacts.require("BistrooToken");

function tokensToHex(tokens) {
  const decimals = web3.utils.toBN(18);
  const transferAmount = web3.utils.toBN(parseInt(tokens, 10));
  const transferAmountHex = '0x' + transferAmount.mul(web3.utils.toBN(10).pow(decimals)).toString('hex');
  return transferAmountHex;
}

/// @dev to prevent BigNumber issue
function numAsHex(num) {
  let hexNum = "0x" + num.toString('hex');
  return hexNum;
}

contract("BistrooReward", accounts => {
  let tokenInstance;
  let contractInstance;
  let erc1820;
  let contractAddress;
  let userData = "0x";
  let registry;
  let result;
  // let balanceContractBefore;
  // let balanceContractAfter;
  // let balanceOwnerBefore;
  // let balanceOwnerAfter;

  console.log("\naccounts: %s", accounts);
  const owner = accounts[0];
  const referral = accounts[1];
  const referrer = accounts[2];
  const confirmer = accounts[3];
  const reward = 100;
  const rewardPool = 250;

  const sendTokens = async (_to, _amount, _fromAddress) => {
    await tokenInstance.transfer(_to, _amount, {from: _fromAddress})
  }

  const initiateTest = async() => {
    tokenInstance = await BistrooToken.deployed();
    contractInstance = await BistrooReward.deployed();
    contractAddress = contractInstance.address;
    erc1820 = await singletons.ERC1820Registry(owner);
    console.log("\ninitiated\ncontractAddress: %s", contractAddress);
  }

  initiateTest();

  const registerReferral = async (_referrer, _referral) => {
    await contractInstance.registerReferral(_referrer, {from: _referral})
  }

  const triggerReward = (async (_referral, _reward, _fromAddress) => {
    await contractInstance.triggerReward(_referral, _reward, {from: _fromAddress})
  })

  it("funds reward pool",  async () => {
    let amount = tokensToHex(rewardPool);
    await sendTokens(contractAddress, amount, owner);

    // establish initial balances
    let balanceContract = await tokenInstance.balanceOf.call(contractAddress);
    // let balanceReferrer = await tokenInstance.balanceOf.call(referrer);

    // check that tokens were transferred
    assert.equal(
      web3.utils.toHex(balanceContract),
      tokensToHex(rewardPool),
      'reward pool did not receive the tokens');
    })
  
  it("registers a new referral",  async () => {
    // const result = await debug(registerReferral(referrer, referral));
    await registerReferral(referrer, referral);
    registry = await contractInstance.referrals(referral);

    assert.equal(
      registry.status,
      "1-registered",
      "status is not '1-registered'"
    );
    
    assert.equal(
      registry.referrer,
      referrer,
      "referrer is not correct (" + referrer + ")"
    )
  })

  it("rejects registerReferral not done by Confirmer",  async () => {
    await truffleAssert.reverts(
      triggerReward(referral, reward, accounts[4]),
      "Reward not triggered by Confirmer!"
    )
  })

  it("accepts registerReferral done by Confirmer",  async () => {
    await triggerReward(referral, reward, owner),
    registry = await contractInstance.referrals(referral);
    // console.log("\nregistry: %s\n", registry);
    assert.equal(
      registry.status,
      "2-rewarded",
      "status is not '2-rewarded'"
    );
  })

  it("pauses the contract",  async () => {
    result = await contractInstance.setPaused("true");
    await truffleAssert.eventEmitted(result, 'pausedSet', (ev) => {
      return ev.paused === true;
    })
  })

  it("rejects calling a paused contract",  async () => {
    await truffleAssert.reverts(
      registerReferral(referrer, referral),
      "Contract is paused!"
    )
  })

  // it("kills the contract and returns the funds to the owner",  async () => {
  //   balanceContractBefore = await tokenInstance.balanceOf.call(contractAddress);
  //   balanceOwnerBefore = await tokenInstance.balanceOf.call(contractAddress);
  //   await contractInstance.kill({from: owner});
  //   balanceContractAfter = await tokenInstance.balanceOf.call(contractAddress);
  //   balanceOwnerAfter = await tokenInstance.balanceOf.call(contractAddress);
  //   let balanceContractChange = balanceContractAfter - balanceContractBefore;
  //   let balanceOwnerChange = balanceOwnerAfter - balanceOwnerBefore;
  //   console.log("\balanceContractChange, balanceOwnerChange: %s %s\n", balanceContractChange, balanceOwnerChange);

  //   // check that tokens were transferred
  //   assert.equal(
  //     balanceContractChange,
  //     balanceOwnerChange,
  //     'Contract balance not send to Owner'
  //   );

  //   // await truffleAssert.eventEmitted(result, 'contractKilled', (ev) => {
  //   //     return ev.contractKilled === "Contract killed";
  //   // })

  //   assert.equal(
  //     web3.eth.getCode(contractAddress).getNumberOfElements(),
  //     0,
  //     'Contract ABI still present'
  //   );
  // })
  

});

