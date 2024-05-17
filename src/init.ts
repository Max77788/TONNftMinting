import * as fs from 'fs/promises';
import * as dotenv from "dotenv";
import { updateMetadataFiles, uploadFolderToIPFS } from "../metadata";
import { openWallet } from "./utils";
import { Address } from "ton-core";
import { waitSeqno } from "./delay";
import { NftCollection } from "./contracts/NftCollection";
import { toNano } from "ton-core";
import { NftItem } from "./contracts/MyNftItem";
import { NftMarketplace } from "./contracts/NftMarketplace";
import { GetGemsSaleData, NftSale } from "./contracts/NftSale";
import { Request, Response } from 'express';

dotenv.config();

interface CountData {
    nftsMinted: number;
    browserPlayerWalletAddress?: string;
  }
  
  async function readCount(): Promise<CountData> {
    try {
      const data = await fs.readFile('./src/count.json', 'utf8');
      const json: CountData = JSON.parse(data);
      return json;
    } catch (error) {
      console.error('Error reading count file:', error);
      return { nftsMinted: 0 }; // Default to 0 if there's an error
    }
  }
  
  async function writeCount(count: CountData): Promise<void> {
    try {
      const data = JSON.stringify(count, null, 2);
      await fs.writeFile('./src/count.json', data, 'utf8');
    } catch (error) {
      console.error('Error writing count file:', error);
    }
  }

  async function init(browserPlayerWalletAddress: Address | string) {
    const COLLECTION_ADDRESS = "kQAmZdYJyzBsDhu-_I8qnv6zvwlJUyp_eoXvhqUhXfqD-jfp";
    const wallet = await openWallet(process.env.MNEMONIC!.split(" "), true);
  
    let { nftsMinted: total_minted_sofar, browserPlayerWalletAddress: savedWalletAddress } = await readCount();
    console.log(`Total minted so far read: ${total_minted_sofar}`);
    if (savedWalletAddress) {
      console.log(`Saved browser player wallet address: ${savedWalletAddress}`);
    }
  
    if (total_minted_sofar >= 10004) {
      throw new Error('No more NFTs can be minted');
    }
  
    const file_name = "xxx_insect.png";
  
    console.log(`Start deploy of NFT Item`);
    const mintParams = {
      queryId: 0,
      itemOwnerAddress: wallet.contract.address,
      itemIndex: total_minted_sofar,
      amount: toNano("0.05"),
      commonContentUrl: file_name,
    };
  
    const nftItem = new NftItem(COLLECTION_ADDRESS);
  
    try {
      const seqno_topup = await nftItem.topUpBalance(wallet);
      await waitSeqno(seqno_topup, wallet);
  
      console.log(`Balance top-upped`);
      const seqno = await nftItem.deploy(wallet, mintParams);
      console.log(`Successfully deployed NFT Item`);
      await waitSeqno(seqno, wallet);
  
      const nftToSendAddress = await NftItem.getAddressByIndex(COLLECTION_ADDRESS, total_minted_sofar);
  
      await NftItem.transfer(wallet, nftToSendAddress, browserPlayerWalletAddress);
  
      console.log(`Successfully transferred nft with address ${nftToSendAddress} to user with address: ${browserPlayerWalletAddress}`);
  
      // Increment the count and save it
      total_minted_sofar++;
      await writeCount({ nftsMinted: total_minted_sofar });
  
      console.log(`Total minted so far incremented and read: ${total_minted_sofar}`);
  
    } catch (error) {
      console.error('Error during NFT minting process:', error);
    }
  }
  
  async function getNftCount(req: Request, res: Response) {
    const { nftsMinted } = await readCount();
    res.json({ nftsMinted });
  }
  
  export { init, getNftCount };