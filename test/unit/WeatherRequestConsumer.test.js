const { assert } = require("chai")
const { ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config.js")
const { numToBytes32 } = require("../../utils/numToBytes32.js")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("WeatherReuqestConsumer Unit Tests", function () {
          let weatherRequestConsumerContract,
              deployer,
              oracleDeployer,
              defaultDegree = 25

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = accounts[0]
              //   minter = accounts[1]
              await deployments.fixture(["mocks", "models", "requestWeather"]) // Deploys modules with the tags "mocks" and "models"
              oracle = await ethers.getContract("MockOracle") // Returns a new connection to the MockOracle contract
              oracleDeployer = oracle.connect(deployer)
              weatherRequestConsumerContract = await ethers.getContract(
                  "WeatherRequestConsumer",
              ) // Returns a new connection to the models contract
              deployer = weatherRequestConsumerContract.connect(deployer)

              modelsContract = await ethers.getContract("Models")
          })

          describe("constructor", function () {
              it("initializes the WeatherRequestComsumer correctly", async () => {
                  const chainlinkToken = (
                      await weatherRequestConsumerContract.callStatic.getChainlinkToken()
                  ).toString()
                  assert.isNotNull(chainlinkToken)
              })
          })

          describe("fulfillWeather", function () {
              it("call back fulfillWeather function after request currentWeather", async () => {
                  const reqTx = await deployer.requestCurrentWeather()
                  const txReceipt = await reqTx.wait(1)
                  const requestId = txReceipt.events[0].args[0]
                  // This will be more important for our staging tests...
                  await new Promise(async (resolve, reject) => {
                      // event listener for MintSuccess
                      deployer.once("ReceivedFulfillWeather", async () => {
                          try {
                              console.log("ReceivedFulfillWeather event fired!")
                              const currentDegree =
                                  await modelsContract.callStatic.getCurrentDegree()
                              assert.equal(
                                  currentDegree.toNumber(),
                                  defaultDegree,
                              )
                              resolve() // if try passes, resolves the promise
                          } catch (e) {
                              reject(e) // if try fails, rejects the promise
                          }
                      })
                      try {
                          await oracleDeployer.fulfillOracleRequest(
                              requestId,
                              numToBytes32(defaultDegree),
                          )
                      } catch (e) {
                          reject(e)
                      }
                  })
              })
          })
      })
