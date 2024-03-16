const { assert } = require("chai");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChain } = require("../../helper-hardhat-config");

developmentChain.includes(network.name)
  ? describe.skip
  : describe("FundMe Staging Tests", async () => {
      let deployer;
      let fundMe;
      const sendValue = ethers.parseEther("0.1");
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        fundMe = await ethers.getContract("FundMe", deployer);
      });

      it("allows people to fund and withdraw", async () => {
        const fundTxResponse = await fundMe.fund({ value: sendValue });
        await fundTxResponse.wait(1);
        const withdrawTxResponse = await fundMe.withdraw();
        await withdrawTxResponse.wait(1);

        const endingFundMeBalance = await ethers.provider.getBalance(
          await fundMe.getAddress()
        );
        console.log(
          endingFundMeBalance + " should equal 0, running assert equal..."
        );
        assert.equal(endingFundMeBalance, "0");
      });
    });
