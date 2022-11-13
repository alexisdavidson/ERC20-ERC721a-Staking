// https://medium.com/@ItsCuzzo/using-merkle-trees-for-nft-whitelists-523b58ada3f9

// Add "type": "module",   to package.json before executing this script

import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import whitelistAddresses from '../../frontend/components/whitelistAddresses.json' assert { type: "json" };

// 3. Create a new array of `leafNodes` by hashing all indexes of the `whitelistAddresses`
// using `keccak256`. Then creates a Merkle Tree object using keccak256 as the algorithm.
//
// The leaves, merkleTree, and rootHas are all PRE-DETERMINED prior to whitelist claim
const leafNodes = whitelistAddresses.map(addr => keccak256(addr));
const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true});

// 4. Get root hash of the `merkleeTree` in hexadecimal format (0x)
// Print out the Entire Merkle Tree.
const buf2hex = x => '0x' + x.toString('hex')

const rootHash = merkleTree.getRoot();
console.log('Whitelist Merkle Tree\n', merkleTree.toString());
console.log("Root Hash Hex: ", buf2hex(merkleTree.getRoot()));

// ***** ***** ***** ***** ***** ***** ***** ***** // 

// CLIENT-SIDE: Use `msg.sender` address to query and API that returns the merkle proof
// required to derive the root hash of the Merkle Tree

// ✅ Positive verification of address
let claimingAddress = leafNodes[0];
// ❌ Change this address to get a `false` verification
// claimingAddress = keccak256("0xD71E736a7eF7a9564528D41c5c656c46c18a2AEb");

// `getHexProof` returns the neighbour leaf and all parent nodes hashes that will
// be required to derive the Merkle Trees root hash.
const hexProof = merkleTree.getHexProof(claimingAddress);
console.log(hexProof);

// ✅ - ❌: Verify is claiming address is in the merkle tree or not.
// This would be implemented in your Solidity Smart Contract
console.log(merkleTree.verify(hexProof, claimingAddress, rootHash));