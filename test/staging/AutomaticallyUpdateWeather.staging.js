const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config.js")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Weather Reqeust Tests", function () {
          let automatical, deployer
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              automatical = await ethers.getContract(
                  "AutomaticallyUpdateWeather",
                  deployer,
              )
          })

          describe("fulfillWeather", function () {
              it("call back after request current weather", async () => {
                  const tx = await automatical.requestCurrentWeather({})
                  tx.wait(1)
                  // This will be more important for our staging tests...
                  await new Promise(async (resolve, reject) => {
                      // event listener for MintSuccess
                      automatical.once("ReceivedFulfillWeather", async () => {
                          try {
                              console.log("ReceivedFulfillWeather event fired!")
                              resolve()
                          } catch (error) {
                              reject(error)
                          }

                          // assert throws an error if it fails, so we need to wrap it in a try/catch so that the promise returns event if it fails.
                      })
                  })
              })
          })
      })
