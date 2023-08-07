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

    let oracleAddress,
        subscriptionId,
        oracle,
        jobId,
        linkTokenAddress,
        linkToken
    if (chainId == 31337) {
        // create VRFV2 Subscription
        oracle = await ethers.getContract("MockOracle")
        oracleAddress = oracle.address

        linkToken = await ethers.getContract("LinkToken")
        linkTokenAddress = linkToken.address
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
    } else {
        oracleAddress = networkConfig[chainId]["oracleAddress"]
        linkTokenAddress = networkConfig[chainId]["linkTokenAddress"]
    }

    subscriptionId = networkConfig[chainId]["subscriptionId"]
    jobId = networkConfig[chainId]["jobId"]

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")

    const models = await ethers.getContract("Models")

    const arguments = [jobId, oracleAddress, linkTokenAddress, models.address]

    const weatherRequestConsumer = await deploy("WeatherRequestConsumer", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    // Verify the deployment
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...")
        await verify(weatherRequestConsumer.address, arguments)
    } else {
        await linkToken.transfer(
            weatherRequestConsumer.address,
            ethers.utils.parseEther("1"),
        )
        log("transfer 1 link token for ", weatherRequestConsumer.address)
    }
    log("Enter WeatherRequestConsumer with command:")
    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log(`yarn hardhat run scripts/requestWeather.js --network ${networkName}`)
    log("----------------------------------------------------")
}
module.exports.tags = ["all", "requestWeather"]
