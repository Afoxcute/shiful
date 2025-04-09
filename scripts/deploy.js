const { ethers } = require("hardhat");

async function main() {
    const RPSContract = await ethers.getContractFactory("RockPaperScissors");
    const rpsContract = await RPSContract.deploy();

    // Wait for the contract to be deployed
    await rpsContract.waitForDeployment();

    // Get the deployer's address from the signer
    const [deployer] = await ethers.getSigners();
    
    console.log("Contract deployed successfully.");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Deployed to: ${await rpsContract.getAddress()}`);
    console.log(`Transaction hash: ${rpsContract.deploymentTransaction().hash}`);
}

main()
.then(() => process.exit(0))
.catch(error => {
    console.error(error);
    process.exit(1);
});