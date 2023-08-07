const { run } = require("hardhat")
async function verify(contractAddress, args) {
    try {
        console.log("Verifying contract...")
        //执行command
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
        console.log(
            `This contract address ${contractAddress} has passed the verification`,
        )
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    verify,
}
