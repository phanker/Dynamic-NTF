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
        linkToken = await ethers.getContractAt(
            "LinkToken",
            linkTokenAddress,
            deployer,
        )
    }

    subscriptionId = networkConfig[chainId]["subscriptionId"]
    jobId = networkConfig[chainId]["jobId"]

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")

    const models = await ethers.getContract("Models")

    const arguments = [jobId, oracleAddress, linkTokenAddress, models.address]

    const automaticallyUpdateWeather = await deploy(
        "AutomaticallyUpdateWeather",
        {
            from: deployer,
            args: arguments,
            log: true,
            waitConfirmations: waitBlockConfirmations,
        },
    )

    const transferTx = await linkToken.transfer(
        automaticallyUpdateWeather.address,
        ethers.utils.parseEther("1"),
    )
    await transferTx.wait(1)
    log("transfer 1 link token for ", automaticallyUpdateWeather.address)

    // Verify the deployment
    if (!developmentChains.includes(network.name)) {
        const automaticallyUpdateWeatherContract = await ethers.getContract(
            "AutomaticallyUpdateWeather",
        )
        await automaticallyUpdateWeatherContract.addRequestedPromision(
            networkConfig[chainId].upkeepperRegistryAddress,
        )
        if (process.env.ETHERSCAN_API_KEY) {
            log("Verifying...")
            await verify(automaticallyUpdateWeather.address, arguments)
        }
    }
    log("Enter WeatherRequestConsumer with command:")
    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log(
        `yarn hardhat run scripts/automaticallyUpdateWeather.js --network ${networkName}`,
    )
    log("----------------------------------------------------")
}
module.exports.tags = ["all", "automaticallyUpdateWeather"]
