// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "./Models.sol";

contract WeatherRequestConsumer is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 private constant ORACLE_PAYMENT = (1 * LINK_DIVISIBILITY) / 10; // 0.1 * 10**18

    string public jobId;
    address public immutable operationAddress;
    Models public modeles;

    mapping(address => bool) authenticatedUser;

    string public wheatherUrl =
        "https://api.open-meteo.com/v1/forecast?latitude=30.5833&longitude=114.2667&current_weather=true";

    modifier AuthenticatedUser() {
        require(authenticatedUser[msg.sender], "You don't have permission.");
        _;
    }

    event ReceivedFulfillWeather();

    /**
     *  Sepolia
     *@dev LINK address in Sepolia network: 0x779877A7B0D9E8603169DdbD7836e478b4624789
     * @dev Check https://docs.chain.link/docs/link-token-contracts/ for LINK address for the right network
     */
    /**
     * @param _jobId   this id is jobId of job running on your chainlink node
     * @param _oracle  this is the operationAddress
     */
    constructor(
        string memory _jobId,
        address _oracle,
        address linkAddress,
        address modelesAddress
    ) ConfirmedOwner(msg.sender) {
        modeles = Models(modelesAddress);
        jobId = _jobId;
        operationAddress = _oracle;
        setChainlinkToken(linkAddress);
        authenticatedUser[msg.sender] = true;
    }

    function requestCurrentWeather() public AuthenticatedUser {
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(jobId),
            address(this),
            this.fulfillWeather.selector
        );
        req.add("get", wheatherUrl);
        req.add("path", "current_weather,temperature");
        req.addInt("times", 100);
        sendChainlinkRequestTo(operationAddress, req, ORACLE_PAYMENT);
    }

    function fulfillWeather(
        bytes32 _requestId,
        int256 _degree
    ) public recordChainlinkFulfillment(_requestId) {
        // currentDegree = degree;
        modeles.changeERTStatus(_degree);
        emit ReceivedFulfillWeather();
    }

    function addRequestedPromision(address _user) public onlyOwner {
        authenticatedUser[_user] = true;
    }

    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }

    function changeUrlforWeather(string calldata _url) public {
        wheatherUrl = _url;
    }

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    ) public onlyOwner {
        cancelChainlinkRequest(
            _requestId,
            _payment,
            _callbackFunctionId,
            _expiration
        );
    }

    function stringToBytes32(
        string memory source
    ) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            // solhint-disable-line no-inline-assembly
            result := mload(add(source, 32))
        }
    }
}
