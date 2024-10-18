# Movement contract deployment with Hardhat and Fractal

First we setup

```shell
# Create a project directory and navigate into it
mkdir hardhat-move-evm
cd hardhat-move-evm

# Initialize npm
npm init -y

# Create a new Hardhat project
npx hardhat init

#Installing hardhat (choose javascript) and setting up dependcies
npm install --save-dev "hardhat@^2.19.0" "@nomicfoundation/hardhat-toolbox@^3.0.0"

#Install dotenv
npm install dotenv

#Create an .env file and add your private key:
nano .env
#Copy below and replace `` with your private key without "0x":
PRIVATE_KEY=
```

# Configure Hardhat: Edit "hardhat.config.js" to include M1 network configurations

```shell
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  defaultNetwork: "m1",
  networks: {
    hardhat: {},
    m1: {
      url: "https://mevm.devnet.imola.movementlabs.xyz",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 30732
    }
  },
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

# Write and deploy contract
1. Create Contract: Under "contracts/", create a file "Lock.sol":

```shell
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Lock {
    uint public unlockTime;
    address payable public owner;

    event Withdrawal(uint amount, uint when);

    constructor(uint _unlockTime) payable {
        require(block.timestamp < _unlockTime, "Unlock time should be in the future");
        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);
        owner.transfer(address(this).balance);
    }
}
```

2. Deploy Contract: Create a deployment script "scripts/deploy.js"

This first script deploys a basic smart contract and it logs the contract address once deployment is successful.
```shell
const fs = require('fs');

async function main() {
  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy(/* constructor args */);

  console.log("Lock deployed to:", lock.address);

  // Save the deployed contract address to a file
  fs.writeFileSync('deployed_address.txt', `Contract deployed to: ${lock.address}`, (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("Deployed contract address saved to file.");
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

This second script also deploys the contract but it explicitly handles the Hardhat Runtime Environment (hre). It calculates the current timestamp, adds 60 seconds to create an unlockTime, and transfers 0.001 ETH (lockedAmount) to the contract during deployment. It waits for the deployment to finish and logs the amount of ETH locked, the unlock timestamp, and the contract address once completed.
```shell
const fs = require('fs');
const hre = require("hardhat");

async function main() {
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const unlockTime = currentTimestampInSeconds + 60;

  const lockedAmount = hre.ethers.parseEther("0.001");

  const lock = await hre.ethers.deployContract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  await lock.waitForDeployment();

  console.log(
    `Lock with ${ethers.formatEther(
      lockedAmount
    )}ETH and unlock timestamp 
{lock.target}`
  );

  fs.writeFileSync('deployed_address.txt', `Contract deployed to: ${lock.address}`, (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("Deployed contract address saved to file.");
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

3. Run Deployment: Execute the deployment script
```shell
npx hardhat run scripts/deploy.js --network m1
```
This message "Lock with 0.001ETH and unlock timestamp <some numbers> deployed to <contract address>" will indicate that you've successfully deployed your contract. Cheers!


# Interact with your smart contract
The step below is for those who used the second script or has >= 0.001ETH balance in the deployed address.

Ensure you replace "<lockAddress>" with your deployed contract address
```shell
const hre = require("hardhat");

async function main() {
    const lockAddress = "<lockAddress>";
    console.log(`Lock address: ${lockAddress}`)
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer address: ${deployer.address}`);
    const lockedAmount = await hre.ethers.provider.getBalance(lockAddress);
    const currentBalance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(
        `Current balance of ${deployer.address} is ${hre.ethers.formatEther(currentBalance)}ETH`
    );
    const lock = await hre.ethers.getContractAt("Lock", lockAddress);

    const tx = await lock.withdraw();
    await tx.wait();

    console.log(
        `Withdrawn ${hre.ethers.formatEther(lockedAmount)}ETH from ${lockAddress} to ${deployer.address}`
    );

    const posBalance = await hre.ethers.provider.getBalance(deployer.address);

    console.log(
        `Balance after withdrawal of ${deployer.address} is ${hre.ethers.formatEther(posBalance)}ETH`
    );
    console.log(`sum of previous balance and withdrawn value: ${currentBalance + lockedAmount}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

Run the command below
```shell
npx hardhat run scripts/withdraw.js --network m1
```
```shell
#If you've been successful you'll see the message below

Balance after withdrawal of ... is ... ETH
sum of previous balance and withdrawn value: ...
```
