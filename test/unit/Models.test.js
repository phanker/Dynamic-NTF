const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config.js")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Models Unit Tests", function () {
          let models,
              modelsContract,
              vrfCoordinatorV2Mock,
              preMintFee,
              mintFee,
              interval,
              minter,
              deployer,
              owner,
              maxNumberOftoken
          //   ,
          //   accounts

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              deployer = accounts[0]
              minter = accounts[1]
              await deployments.fixture(["mocks", "models"]) // Deploys modules with the tags "mocks" and "models"
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
              ) // Returns a new connection to the VRFCoordinatorV2Mock contract

              modelsContract = await ethers.getContract("Models") // Returns a new connection to the models contract
              owner = modelsContract.connect(deployer)
              models = modelsContract.connect(minter) // Returns a new instance of the models contract connected to player
              //   interval = await raffle.getInterval()
              preMintFee = ethers.utils.parseEther("0.0001")
              mintFee = ethers.utils.parseEther("0.0005")
              maxNumberOftoken = await models.getMaxNumberOftoken()
          })

          describe("constructor", function () {
              it("initializes the models correctly", async () => {
                  const totalSupply = (await models.totalSupply()).toString()
                  // Comparisons for models initialization:
                  assert.equal(totalSupply, "0")
                  assert.equal(maxNumberOftoken.toString(), "10")
              })
          })

          describe("preMint", function () {
              it("reverts if the eth you mint is incorrect", async () => {
                  await expect(models.preMint()).to.be.revertedWith(
                      " The price of each MDS is 0.0001 ether.",
                  )
              })

              it("reverts as you are not in the whiteList", async () => {
                  await expect(
                      models.preMint({ value: preMintFee }),
                  ).to.be.revertedWith(
                      // is reverted when not in the whiteList
                      "NOT__IN__WHITE__LIST",
                  )
              })

              it("emits event on preMint", async () => {
                  await owner.addWhiteList([minter.address])
                  await expect(
                      models.preMint({
                          value: preMintFee,
                      }),
                  ).to.emit(
                      // emits RaffleEnter event if entered to index player(s) address
                      models,
                      "MintRequest",
                  )
              })
          })

          describe("transferWindowState", function () {
              it("reverts if people mints in the premint window", async () => {
                  await expect(models.mint()).to.be.revertedWith(
                      "Mint has not opened yet!",
                  )

                  await owner.transferWindowState()
                  await expect(models.mint()).to.be.revertedWith(
                      " The price of each MDS is 0.0005 ether.",
                  )
                  const windowState = await owner.getCurrentWindowState()
                  assert.equal(windowState.toString(), "1")
              })
          })

          describe("maxNumberOFBES", function () {
              it("reverts if the max number of BES over 10", async () => {
                  for (let index = 0; index <= maxNumberOftoken; index++) {
                      const model = modelsContract.connect(accounts[index])
                      const model_tx = await owner.addWhiteList([
                          accounts[index].address,
                      ])
                      if (index == maxNumberOftoken) {
                          await expect(
                              model.preMint({
                                  value: preMintFee,
                              }),
                          ).to.be.revertedWith("OVER__MAX__NUM__OF__BES")
                          break
                      }
                      const mintTx = await model.preMint({
                          value: preMintFee,
                      })
                      mintTx.wait(1)
                  }
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  // the first need adding minter's address in white list
                  await owner.addWhiteList([minter.address])
              })

              it("can only be called after mint", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          0,
                          modelsContract.address,
                      ), // reverts if not fulfilled
                  ).to.be.revertedWith("nonexistent request")
              })

              //prmint an erc721
              //listening requestId via event MintRequest
              //accord requestId to call fulfillRandomWords function
              it("call back after mint a NTF then checks if success for creating a NFT ", async () => {
                  await owner.transferWindowState()

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
                          console.log("requestId = ", requestId.toString())
                          // assert throws an error if it fails, so we need to wrap it in a try/catch so that the promise returns event if it fails.
                          try {
                              const totalSupply = (
                                  await modelsContract.callStatic.totalSupply()
                              ).toString()
                              assert.equal(totalSupply, "1")
                              const balanceOf = (
                                  await modelsContract.callStatic.balanceOf(
                                      minter.address,
                                  )
                              ).toString()
                              assert.equal(balanceOf, "1")
                              resolve() // if try passes, resolves the promise
                          } catch (e) {
                              reject(e) // if try fails, rejects the promise
                          }
                      })

                      try {
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestId,
                              models.address,
                          )
                      } catch (e) {
                          reject(e)
                      }
                  })
              })
          })
      })
