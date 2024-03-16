const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChain } = require("../../helper-hardhat-config");

!developmentChain.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
      let fundMe;
      let deployer;
      //const sendValue = "1000000000000000000";
      const sendValue = ethers.parseEther("1");

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        //console.log(`Deployer's Address: ${deployer}`);
        await deployments.fixture(["all"]); // this single line deploys all our contracts - thanks to the "all" tags - see deploy scripts for tags
        // this returns instance of fundMe contract, which is automatically connected to the deployer

        const myContract = await deployments.get("FundMe");
        fundMe = await ethers.getContractAt(myContract.abi, myContract.address);

        const mymockV3Aggregator = await deployments.get("MockV3Aggregator");
        mockV3Aggregator = await ethers.getContractAt(
          mymockV3Aggregator.abi,
          mymockV3Aggregator.address
        );
      });

      describe("constructor", function () {
        it("sets the aggregator addresses correctly", async () => {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.target);
        });
      });

      describe("fund", function () {
        it("Fails if you don't send enough ETH", async () => {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });

        it("updates the amount funded data structure", async () => {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue);
        });

        it("Adds funder to array of funders", async () => {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", async () => {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue });
        });

        it("Withdraw ETH from a single funder", async () => {
          // Arrange
          const startingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, gasPrice } = transactionReceipt;
          const gasCost = gasPrice * gasUsed;

          const endingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            endingDeployerBalance,
            startingDeployerBalance + startingFundMeBalance - gasCost
          );
        });

        it("allows us to withdraw with multiple funders", async () => {
          // Arrange

          const accounts = await ethers.getSigners(); // fetches the list of accounts in hardhat / localhost
          for (let i = 1; i < accounts.length; i++) {
            // starting from 1 because the 0th account is of the deployer
            const fundMeConnectedContract = await fundMe.connect(accounts[i]); // creating new objects for different accounts
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          //* Act
          // Let's perform the withdraw and retrieve the result
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          // Calculate gas cost for this transcation
          const { gasPrice, gasUsed } = transactionReceipt;
          const gasCost = gasPrice * gasUsed;

          const endingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            endingDeployerBalance,
            startingDeployerBalance + startingFundMeBalance - gasCost
          );

          // Make sure that funders are reset to 0 properly
          // Array reset (the array resetted so if we access the first elemet, it's will be reverted)

          await expect(fundMe.getFunder(0)).to.be.reverted;

          // Mapping reset
          for (let index = 0; index < 6; index++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[index].address),
              0
            );
          }
        });

        it("Only allows the owner to withdraw", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[3];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe_NotOwner");
        });
      });

      describe("withdrawCheaper", async () => {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue });
        });

        it("Withdraw ETH from a single funder", async () => {
          // Arrange
          const startingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, gasPrice } = transactionReceipt;
          const gasCost = gasPrice * gasUsed;

          const endingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            endingDeployerBalance,
            startingDeployerBalance + startingFundMeBalance - gasCost
          );
        });

        it("allows us to withdraw with multiple funders", async () => {
          // Arrange

          const accounts = await ethers.getSigners(); // fetches the list of accounts in hardhat / localhost
          for (let i = 1; i < accounts.length; i++) {
            // starting from 1 because the 0th account is of the deployer
            const fundMeConnectedContract = await fundMe.connect(accounts[i]); // creating new objects for different accounts
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          //* Act
          // Let's perform the withdraw and retrieve the result
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          // Calculate gas cost for this transcation
          const { gasPrice, gasUsed } = transactionReceipt;
          const gasCost = gasPrice * gasUsed;

          const endingFundMeBalance = await ethers.provider.getBalance(
            await fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            endingDeployerBalance,
            startingDeployerBalance + startingFundMeBalance - gasCost
          );

          // Make sure that funders are reset to 0 properly
          // Array reset (the array resetted so if we access the first elemet, it's will be reverted)

          await expect(fundMe.getFunder(0)).to.be.reverted;

          // Mapping reset
          for (let index = 0; index < 6; index++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[index].address),
              0
            );
          }
        });

        it("Only allows the owner to withdraw", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[3];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(
            attackerConnectedContract.cheaperWithdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe_NotOwner");
        });
      });
    });
