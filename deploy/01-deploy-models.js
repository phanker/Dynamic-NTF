const { network, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock
    const FUND_AMOUNT = ethers.utils.parseEther("1") // 1 Ether, or 1e18 (10^18) Wei
    const maxNumberOftoken = 10

    if (chainId == 31337) {
        // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse =
            await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")

    const arguments = [
        maxNumberOftoken,
        subscriptionId,
        vrfCoordinatorV2Address,
        networkConfig[chainId]["gasLane"],
    ]
    const models = await deploy("Models", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    // Ensure the models contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock",
        )
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, models.address)
    } else {
        const vrfCoordinatorV2 = await ethers.getContractAt(
            "VRFCoordinatorV2Interface",
            vrfCoordinatorV2Address,
            deployer,
        )
        const vrfTx = await vrfCoordinatorV2.addConsumer(
            subscriptionId,
            models.address,
        )
        await vrfTx.wait(1)
    }

    // Verify the deployment
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(models.address, arguments)
    }

    log("Enter Models with command:")
    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log(`yarn hardhat run scripts/models.js --network ${networkName}`)
    log("----------------------------------------------------")
}
module.exports.tags = ["all", "models"]
