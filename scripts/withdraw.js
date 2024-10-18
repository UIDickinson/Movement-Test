const hre = require("hardhat");

async function main() {
    const lockAddress = "0x5B97bddC875379c58d96bc810Da8712D39B0d348";
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
})
