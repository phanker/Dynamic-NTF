const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config.js")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Models Staging Tests", function () {
          let models, preMintFee, mintFee, deployer
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              models = await ethers.getContract("Models", deployer)
              preMintFee = ethers.utils.parseEther("0.0001")
              mintFee = ethers.utils.parseEther("0.0005")
          })

          describe("fulfillRandomWords", function () {
              it("call back after mint a NTF then checks if success for creating a NFT ", async () => {
                  await models.addWhiteList([deployer])
                  const tx = await models.transferWindowState()
                  await tx.wait(1)
                  const mintTx = await models.mint({
                      value: mintFee,
                  })
                  const txReceipt = await mintTx.wait(1)
                  const requestId = txReceipt.events[2].args[0]._hex
                  console.log("requestId= ", requestId.toString())
                  // This will be more important for our staging tests...
                  await new Promise(async (resolve, reject) => {
                      // event listener for MintSuccess
                      models.once("MintSuccess", async (requestId, event) => {
                          console.log("MintSuccess event fired!")
                          // assert throws an error if it fails, so we need to wrap it in a try/catch so that the promise returns event if it fails.
                          try {
                              const totalSupply = (
                                  await models.totalSupply()
                              ).toString()
                              assert.equal(totalSupply, "1")
                              const balanceOf = (
                                  await models.balanceOf(deployer)
                              ).toString()
                              assert.equal(balanceOf, "1")
                              resolve() // if try passes, resolves the promise
                          } catch (e) {
                              reject(e) // if try fails, rejects the promise
                          }
                      })
                  })
              })
          })
      })
