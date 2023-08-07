const { assert } = require("chai")
const { ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config.js")
const { numToBytes32 } = require("../../utils/numToBytes32.js")
const {
    loadFixture,
    time,
} = require("@nomicfoundation/hardhat-network-helpers")
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("AutomaticallyUpdateWeather Unit Tests", function () {
          let automaticallyUpdateWeatherContract, deployer, oracleDeployer

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = accounts[0]
              //   minter = accounts[1]
              await deployments.fixture([
                  "mocks",
                  "models",
                  "requestWeather",
                  "automaticallyUpdateWeather",
              ]) // Deploys modules with the tags "mocks" and "models"
              oracle = await ethers.getContract("MockOracle") // Returns a new connection to the MockOracle contract
              oracleDeployer = oracle.connect(deployer)
              automaticallyUpdateWeatherContract = await ethers.getContract(
                  "AutomaticallyUpdateWeather",
              ) // Returns a new connection to the models contract
              deployer = automaticallyUpdateWeatherContract.connect(deployer)

              modelsContract = await ethers.getContract("Models")
          })

          describe("constructor", function () {
              it("initializes the WeatherRequestComsumer correctly", async () => {
                  const counter = (
                      await automaticallyUpdateWeatherContract.callStatic.counter()
                  ).toString()
                  assert.equal(counter, "0")
              })
          })

          describe("checkUpkeep", async function () {
              it("should be able to call checkUpkeep", async function () {
                  const checkData = ethers.utils.keccak256(
                      ethers.utils.toUtf8Bytes(""),
                  )
                  const { upkeepNeeded } =
                      await automaticallyUpdateWeatherContract.callStatic.checkUpkeep(
                          checkData,
                      )
                  assert.equal(upkeepNeeded, false)
              })
          })

          describe("#performUpkeep", async function () {
              describe("success", async function () {
                  it("should be able to call performUpkeep after time passes", async function () {
                      const startingCount =
                          await automaticallyUpdateWeatherContract.counter()

                      const checkData = ethers.utils.keccak256(
                          ethers.utils.toUtf8Bytes(""),
                      )
                      const interval =
                          await automaticallyUpdateWeatherContract.interval()
                      await time.increase(interval.toNumber() + 1)
                      await automaticallyUpdateWeatherContract.performUpkeep(
                          checkData,
                      )
                      const counter =
                          await automaticallyUpdateWeatherContract.counter()
                      assert.equal(startingCount + 1, counter.toNumber())
                  })
              })

              //   describe("failure", async function () {
              //       it("should not be able to call perform upkeep without the time passed interval", async function () {
              //           const { counter } = await loadFixture(
              //               deployAutomationCounterFixture,
              //           )
              //           const checkData = ethers.utils.keccak256(
              //               ethers.utils.toUtf8Bytes(""),
              //           )
              //           await expect(
              //               counter.performUpkeep(checkData),
              //           ).to.be.revertedWith("Time interval not met")
              //       })
              //   })
          })
      })
