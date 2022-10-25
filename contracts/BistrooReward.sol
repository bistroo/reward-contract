pragma experimental ABIEncoderV2; // supports structs and arbitrarily nested arrays
pragma solidity>0.4.99<0.6.0;

/// @author Robert Rongen, Blockchain Advies
/// @title Reward contract for Bistroo

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";   // to send and receive ERC777 tokens
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";   // to receive ERC777 tokens
import "@openzeppelin/contracts/token/ERC777/IERC777Sender.sol";   // to send ERC777 tokens
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/introspection/ERC1820Implementer.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/// @dev BistrooReward registers a referrer and rewards Bistroo token after activation message is received.
/// @dev Referral signs message to register the referrer. The Bistroo DApp send the activation message.
contract BistrooReward is Ownable, IERC777Recipient, IERC777Sender, ERC1820Implementer {

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");
    bytes32 constant public TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    IERC777 public bistrooToken;
    using SafeMath for uint256;

	/// @param referPeriod Maximum agreed registration period in seconds. Default = 3 months.
	/// @param referStart Timestamp of registry of referral period start.
	/// @param referEnd Time refer period ends (referStart + referPeriod).
	/// @param referral Registers the referrer.
    /// @param referrer Receives the reward after confirmation.
	/// @param status Sets status of the registration. Possible values: `1-registered, 2-rewarded, 3-periodEnded.
  	/// @param confirmer Confirmer can send reward confirmation.
    bool public paused = false;
    uint256 public referPeriod = 7884000;
    struct ReferralData {
        address referral;
        address referrer;
        uint256 referStart;
        uint256 referEnd;
        string status;
    }
    address confirmer;

    mapping (address => ReferralData) public referrals;
    mapping (address => bool) public isReferral;
    address[] public referralAddresses;

    event receivedTokens(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData);
    event sendTokens(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData);
    event pausedSet(bool paused);
    event confirmerChanged(address _confirmer);
    event referralPeriodChanged(string _message, uint256 _value);
    event referralStatus(address _referral, string _status);
    event contractKilled(string contractKilled);
    
    /// @dev Link contract to Bistroo token.
    /// @dev For a smart contract to receive ERC777 tokens, it needs to implement the tokensReceived hook and register with ERC1820 registry as an ERC777TokensRecipient
    constructor (IERC777 tokenAddress) public Ownable() {
        bistrooToken = IERC777(tokenAddress);
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
        confirmer = msg.sender;
    }

    /// @dev Function required by IERC777Recipient
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,   // asume only uint
        bytes calldata operatorData
    ) external {
        emit receivedTokens(operator, from, to, amount, userData, operatorData);
    }
    /// @dev Functions required by IERC777Sender
    function senderFor(address account) public {
        _registerInterfaceForAddress(TOKENS_SENDER_INTERFACE_HASH, account);
    }

    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) public {
        emit sendTokens(operator, from, to, amount, userData, operatorData);
    }

    /// @dev Custom functions

    function setPaused(bool _paused) onlyOwner public {
        paused = _paused;
        emit pausedSet(paused);
    }
   
    function changeConfirmer(address _confirmer) onlyOwner public {
        require(paused == false, "Contract is paused!");
        require(_confirmer != address(0), "Confirmer: account is the zero address");
        confirmer = _confirmer;
        emit confirmerChanged(_confirmer);
    }

    function changeReferPeriod(uint256 _newReferPeriod) onlyOwner public {
        require(paused == false, "Contract is paused!");
        referPeriod = _newReferPeriod;
        emit referralPeriodChanged("New refer period", _newReferPeriod);
    }

    /// @notice Register referral parameters and store in struct
    // / @return	referralID that is increased by 1 for every new referralID registered
    function registerReferral(address _referrer_address) public {
        // check referral not registered already
        require(paused == false, "Contract is paused!");
        require(isReferral[msg.sender] == false, "Referral already registered");
        uint256 _referStart = uint64(block.timestamp);
        /// @dev set referral parameters
        referrals[msg.sender].referrer = _referrer_address;
        referrals[msg.sender].referStart = _referStart;
        referrals[msg.sender].referEnd = _referStart.add(referPeriod);
        referrals[msg.sender].status = "1-registered";

        /// @dev push the new referral to the array of referrals
        referralAddresses.push(msg.sender) -1;
        emit referralStatus(msg.sender, referrals[msg.sender].status);
    }

    function triggerReward(address _referralAddress, uint256 _reward) public {
        // check conditions
        require(paused == false, "Contract is paused!");
        require(msg.sender == confirmer, "Reward not triggered by Confirmer!");
        // time within reward window
        uint256 _currentTime = uint64(block.timestamp);
        if (_currentTime > referrals[_referralAddress].referEnd) {
            referrals[_referralAddress].status = "3-periodEnded";
        }        

        // status == registered
        require(keccak256(bytes(referrals[_referralAddress].status)) == keccak256(bytes("1-registered")), "Referral unregistered");

        // check if sufficient tokens in contract
        uint256 tokenBalance = bistrooToken.balanceOf(address(this));
        require(_reward <= tokenBalance, "Not enough tokens");

        // send reward
        bistrooToken.send(referrals[_referralAddress].referrer, _reward, "0x");
        referrals[_referralAddress].status = "2-rewarded";
        emit referralStatus(_referralAddress, referrals[_referralAddress].status);
     }

    /// @dev Kill function, only by owner, should return all remaining tokens and Eth to owner
    // function kill () onlyOwner public {
    //     // Transfer tokens to owner (TODO: error handling)
    //     uint256 balance = bistrooToken.balanceOf(address(this));
    //     bistrooToken.send(msg.sender, balance, "0x");
    //     // Transfer Eth to owner and terminate contract 
    //     selfdestruct(msg.sender);
    //     emit contractKilled("Contract killed");
    //   }

}