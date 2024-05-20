import * as dotenv from "dotenv";
import { updateMetadataFiles, uploadFolderToIPFS } from "../metadata";
import { openWallet } from "./utils";
import { readdir } from "fs/promises";
import { Address } from "ton-core";
import { waitSeqno } from "./delay";
import { NftCollection } from "./contracts/NftCollection";
import { toNano } from "ton-core";
import { NftItem } from "./contracts/MyNftItem";
import { NftMarketplace } from "./contracts/NftMarketplace";
import { GetGemsSaleData, NftSale } from "./contracts/NftSale";

dotenv.config();

async function init(browserPlayerWalletAddress: Address | string) {
  
  // const metadataIpfsHash = "https://gateway.pinata.cloud/ipfs/QmU7LPE7kKYwFkxgxcaHiFCbNkou48zEiCpyH8X9XbacNb"
  // const imagesIpfsHash = "https://gateway.pinata.cloud/ipfs/QmYRSJRRwwwxRR4PEsrXaXfR7djxvmi5fndaXrM5qeBtsP"
  const COLLECTION_ADDRESS = "kQAmZdYJyzBsDhu-_I8qnv6zvwlJUyp_eoXvhqUhXfqD-jfp"
  const wallet = await openWallet(process.env.MNEMONIC!.split(" "), true);
  
  /*
  const metadataFolderPath = "./data/metadata/";
  const imagesFolderPath = "./data/images/";

  console.log("Started uploading images to IPFS...");
  const imagesIpfsHash = await uploadFolderToIPFS(imagesFolderPath);
  console.log(
    `Successfully uploaded the pictures to ipfs: https://gateway.pinata.cloud/ipfs/${imagesIpfsHash}`
  );

  console.log("Started uploading metadata files to IPFS...");
  await updateMetadataFiles(metadataFolderPath, imagesIpfsHash);
  const metadataIpfsHash = await uploadFolderToIPFS(metadataFolderPath);
  console.log(
    `Successfully uploaded the metadata to ipfs: https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`
  );
  
  console.log("Start deploy of nft collection...");
  const collectionData = {
    ownerAddress: wallet.contract.address,
    royaltyPercent: 0.05, // 0.05 = 5%
    royaltyAddress: wallet.contract.address,
    nextItemIndex: 0,
    collectionContentUrl: `ipfs://${metadataIpfsHash}/collection.json`,
    commonContentUrl: `ipfs://${metadataIpfsHash}/`,
  };
  const collection = new NftCollection(collectionData);
  let seqno = await collection.deploy(wallet);
  console.log(`Collection deployed: ${collection.address}`);
  await waitSeqno(seqno, wallet);
  const total_minted_sofar = 0;
  */
  


  const file_name = "xxx_insect.png"

  let total_minted_sofar = 2;
  
  console.log(`Start deploy of NFT Item`);
  const mintParams = {
    queryId: 0,
    itemOwnerAddress: wallet.contract.address,
    itemIndex: total_minted_sofar,
    amount: toNano("0.05"),
    commonContentUrl: file_name,
    imageLink: "papapa"
  };

  const nftItem = new NftItem(COLLECTION_ADDRESS);

  const seqno_topup = await nftItem.topUpBalance(wallet);
  await waitSeqno(seqno_topup, wallet);
  
  console.log(`Balance top-upped`);
  const seqno = await nftItem.deploy(wallet, mintParams);
  console.log(`Successfully deployed NFT Item`);
  await waitSeqno(seqno, wallet);
  

  /*
  console.log("Start deploy of new marketplace  ");
  const marketplace = new NftMarketplace(wallet.contract.address);
  seqno = await marketplace.deploy(wallet);
  await waitSeqno(seqno, wallet);
  console.log("Successfully deployed new marketplace");
  
  const saleData: GetGemsSaleData = {
    isComplete: false,
    createdAt: Math.ceil(Date.now() / 1000),
    marketplaceAddress: marketplace.address,
    nftAddress: nftToSaleAddress,
    nftOwnerAddress: null,
    fullPrice: toNano("10"),
    marketplaceFeeAddress: wallet.contract.address,
    marketplaceFee: toNano("1"),
    royaltyAddress: wallet.contract.address,
    royaltyAmount: toNano("0.5"),
  };

  console.log("Start deploy of nft sale contract");

  const nftSaleContract = new NftSale(saleData);
  seqno = await nftSaleContract.deploy(wallet);
  await waitSeqno(seqno, wallet);
  
  console.log(`Successfully deployed nft sale contract: ${nftSaleContract.address}`);

  */

  const nftToSendAddress = await NftItem.getAddressByIndex(COLLECTION_ADDRESS, total_minted_sofar);

  await NftItem.transfer(wallet, nftToSendAddress, browserPlayerWalletAddress);
  
  console.log(`Successfully transferred nft with address ${nftToSendAddress} to user with address: ${browserPlayerWalletAddress}`);

  // console.log(`Successfully transferred nft at address ${nftSaleContract} to sale contract: ${nftSaleContract.address}`)
}


export { init };
