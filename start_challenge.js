require("dotenv").config();
const { ethers } = require("ethers");

// ABI definition for the function and the event
const abi_json = [
  {
    constant: false,
    inputs: [
      { name: "timeout", type: "uint256" },
      { name: "attributeIDs", type: "string[]" },
      { name: "challengeInfo", type: "bytes[]" },
    ],
    name: "submitRequest",
    outputs: [
      { name: "requestID", type: "string" },
      { name: "challengeIDs", type: "string[]" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "requestID", type: "uint" },
      { indexed: false, name: "newChallenges", type: "uint256[]" },
      { indexed: false, name: "attributeIds", type: "string[]" },
    ],
    name: "RequestProcessed",
    type: "event",
  },
];

async function submitChallengeRequest(challenge_type) {
  const timeout = BigInt(100000000);
  const attributeIDs = ["pob-v1.witnesschain.com"];
  const provider = new ethers.providers.JsonRpcProvider(
    "https://blue-orangutan-rpc.eu-north-2.gateway.fm/"
  );

  const wallet = new ethers.Wallet('0xcdf8d34e33baee9680b53a040d392a3b552edf8d66e7f66f42c5d0ee4dc610b2', provider);

  const contractAddress = "0x8A02C91373929a4764F015309B072DC9C9Fabc49";
  const contract = new ethers.Contract(contractAddress, abi_json, wallet);

  const prover = "0x0ae70e18bfd6a84570df6b3c1ffa0a1a107d520e";
  const proverRegistry = "0x91013d3CecE055603D8b1EE7DCB1f670f480fe24";

  // Map the string challenge_type to a number (0 for downlink, 1 for uplink)
  const challenge_type_number = challenge_type === "uplink" ? 1 : 0;

  const isIPv6 = false;
  const numChallengers = 1;
  const bandwidth = 10;
  const tolerance = 0;

  const challengeInfo = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint8", "bool", "uint256", "uint256", "uint256"],
    [proverRegistry, prover, challenge_type_number, isIPv6, numChallengers, bandwidth, tolerance]
  );

  try {
    const gasLimit = 1000000;
    const gasPrice = await provider.getGasPrice();

    // Call the contract function and wait for the transaction receipt
    const tx = await contract.submitRequest(
      ethers.BigNumber.from(String(timeout)),
      attributeIDs,
      [ethers.utils.arrayify(challengeInfo)],
      {
        gasLimit: 1000000,
        gasPrice: 0,
      }
    );

    const receipt = await tx.wait();

    // Extract the RequestProcessed event from the logs
    const eventSignature = ethers.utils.id(
      "RequestProcessed(uint256,uint256[],string[])"
    );

    const logs = receipt.logs.filter((log) => log.topics[0] === eventSignature);

    if (logs.length > 0) {
      const log = logs[0];
      const abi = [
        {
          indexed: false,
          internalType: "uint256[]",
          name: "newChallenges",
          type: "uint256[]",
        },
        {
          indexed: false,
          internalType: "string[]",
          name: "attributeIds",
          type: "string[]",
        },
      ];
      const decodedEvent = ethers.utils.defaultAbiCoder.decode(
        abi.map((i) => i.type),
        log.data
      );

      const ci = {
        requestID: parseInt(Number(logs[0].topics[1])),
        challengeIDs: parseInt(Number(decodedEvent[0])),
      };
      console.log('challenge id', ci.challengeIDs);

    } else {
      console.log("No RequestProcessed event found in the logs.");
    }
  } catch (error) {
    console.error("Error in submitChallengeRequest:", error);
    throw error;
  }
}

submitChallengeRequest(0);

module.exports = { submitChallengeRequest };
