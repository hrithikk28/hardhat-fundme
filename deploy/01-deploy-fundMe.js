// function deplyfunc(hre) {
// hre.getNamedAccounts
// hre.deployments
// }
// module.exports.default = deplyfunc;

// module.exports = async (hre) => {
//   const { getNamedAccounts, deployments } = hre;
// };

const { network } = require("hardhat");
const { networkConfig, developmentChain } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  // when going for localhost or hardhat network we want to use a mock
  // if the contract doesn't exist, we deploy a minimal version of
  // for our local hosting

  //const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  let ethUsdPriceFeedAddress;
  if (developmentChain.includes(network.name)) {
    const ethUsdAggregator = await deployments.get("MockV3Aggregator");
    ethUsdPriceFeedAddress = ethUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  }

  const args = [ethUsdPriceFeedAddress];

  log("Deploying FundMe and waiting for confirmations...");

  const fundMe = await deploy("FundMe", {
    contract: "FundMe",
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  log(`FundMe deployed at ${fundMe.address}`);

  if (
    !developmentChain.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, args);
  }

  log("---------------------------------------------------");
};
module.exports.tags = ["all", "fundme"];
