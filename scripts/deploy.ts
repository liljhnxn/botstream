import hre from "hardhat";
const { ethers } = hre;
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("==========================================");
  console.log("Starting BotStream Smart Contract Deployment");
  console.log("==========================================");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();

  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} native currency`);
  console.log(`Network Name:     ${network.name}`);
  console.log(`Chain ID:         ${network.chainId}`);

  const BotStreamFactory = await ethers.getContractFactory("BotStream");
  console.log("\nDeploying BotStream contract...");
  const botStream = await BotStreamFactory.deploy();

  await botStream.waitForDeployment();
  const contractAddress = await botStream.getAddress();

  console.log("\n Contract Deployed Successfully!");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Chain ID:         ${network.chainId}`);
  console.log(`Explorer URL:     https://scan.bohr.life/address/${contractAddress}`);
  console.log("==========================================");

  // Export ABI & Address to Frontend Config
  const artifactsPath = path.join(process.cwd(), "artifacts/contracts/BotStream.sol/BotStream.json");
  if (fs.existsSync(artifactsPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
    const configDir = path.join(process.cwd(), "src/config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const contractsConfigContent = `// Auto-generated configuration by scripts/deploy.ts
export const BOTSTREAM_CONTRACT_ADDRESS = "${contractAddress}" as \`0x\${string}\`;

export const BOTSTREAM_ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;
`;

    fs.writeFileSync(path.join(configDir, "contracts.ts"), contractsConfigContent, "utf8");
    console.log(" Updated frontend contract config at src/config/contracts.ts");

    const envLocalPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      let envContent = fs.readFileSync(envLocalPath, "utf8");
      if (envContent.includes("NEXT_PUBLIC_BOTSTREAM_CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_BOTSTREAM_CONTRACT_ADDRESS=.*/,
          `NEXT_PUBLIC_BOTSTREAM_CONTRACT_ADDRESS=${contractAddress}`
        );
      } else {
        envContent += `\nNEXT_PUBLIC_BOTSTREAM_CONTRACT_ADDRESS=${contractAddress}\n`;
      }
      fs.writeFileSync(envLocalPath, envContent, "utf8");
      console.log(" Updated .env.local with contract address");
    }
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
