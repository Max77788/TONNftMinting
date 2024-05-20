import * as fs from 'fs/promises';
import * as dotenv from "dotenv";
import { updateMetadataFiles, uploadFolderToIPFS } from "../metadata";
import { openWallet } from "./utils";
import { Address } from "ton-core";
import { PathLike } from 'fs';
import { waitSeqno } from "./delay";
import { NftCollection } from "./contracts/NftCollection";
import { toNano } from "ton-core";
import { NftItem } from "./contracts/MyNftItem";
import { NftMarketplace } from "./contracts/NftMarketplace";
import { GetGemsSaleData, NftSale } from "./contracts/NftSale";
import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

dotenv.config();

interface CountData {
    nftsMinted: number;
    browserPlayerWalletAddress?: string;
}

async function readCount(path: PathLike): Promise<CountData> {
    try {
        const data = await fs.readFile(path, 'utf8');
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

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn: () => Promise<any>, retries: number, delayFactor: number = 1000) {
  let attempt = 0;

  while (attempt < retries) {
      try {
          return await fn();
      } catch (error) {
          if (!(error instanceof AxiosError) || attempt >= retries - 1 || error.response?.status !== 429) {
              throw error;
          }
          attempt++;
          console.log(`Attempt ${attempt} failed. Retrying in ${attempt * delayFactor}ms...`);
          await delay(attempt * delayFactor);
      }
  }
  throw new Error('Max retries reached');
}


async function init(browserPlayerWalletAddress: Address | string) {
    const COLLECTION_ADDRESS = "kQAmZdYJyzBsDhu-_I8qnv6zvwlJUyp_eoXvhqUhXfqD-jfp";
    const wallet = await openWallet(process.env.MNEMONIC!.split(" "), true);

    let { nftsMinted: total_minted_sofar, browserPlayerWalletAddress: savedWalletAddress } = await readCount('./src/count.json');
    console.log(`Total minted so far read: ${total_minted_sofar}`);
    if (savedWalletAddress) {
        console.log(`Saved browser player wallet address: ${savedWalletAddress}`);
    }

    if (total_minted_sofar >= 10008) {
        throw new Error('No more NFTs can be minted');
    }

    const file_name = "xxx_insect.png";
    const IMAGE_LINK = "https://ipfs.io/ipfs/QmRWYjxAvjdbk4bEqv7Zkm13Lu9iFyLbHrZV5MctReK5Ue"

    console.log(`Start deploy of NFT Item`);
    const mintParams = {
        queryId: 0,
        itemOwnerAddress: wallet.contract.address,
        itemIndex: total_minted_sofar,
        amount: toNano("0.05"),
        commonContentUrl: file_name,
        imageLink: IMAGE_LINK
    };

    const nftItem = new NftItem(COLLECTION_ADDRESS);

    console.log("NFT Item created");

    try {
        // console.log(`Start top-up balance(removed for now)`);
        console.log(`Start top-up balances`);
        const seqno_topup = await nftItem.topUpBalance(wallet);
        // const seqno_topup = await retryWithBackoff(() => nftItem.topUpBalance(wallet), 5);
        await waitSeqno(seqno_topup, wallet);

        // console.log(`Balance top-upped(removed for now)`);
        console.log(`Balance top-upped`);

        console.log(`Start .deploy() method of NFT Item`)
        const seqno = await nftItem.deploy(wallet, mintParams)
        // const seqno = await retryWithBackoff(() => nftItem.deploy(wallet, mintParams), 5);
        console.log(`Successfully deployed NFT Item`);
        await waitSeqno(seqno, wallet);

        const nftToSendAddress = await NftItem.getAddressByIndex(COLLECTION_ADDRESS, total_minted_sofar);

        await NftItem.transfer(wallet, nftToSendAddress, browserPlayerWalletAddress);
        // await retryWithBackoff(() => NftItem.transfer(wallet, nftToSendAddress, browserPlayerWalletAddress), 5);

        console.log(`Successfully transferred nft with address ${nftToSendAddress} to user with address: ${browserPlayerWalletAddress}`);

        // Increment the count and save it
        total_minted_sofar++;
        await writeCount({ nftsMinted: total_minted_sofar });

        console.log(`Total minted so far incremented and read: ${total_minted_sofar}`);

    } catch (error) {
        console.error('Error during NFT minting process:', error);
        throw new Error('Initialization failed. Please try again later.');
    }
}

async function getNftCount(req: Request, res: Response) {
    const { nftsMinted } = await readCount('./src/count.json');
    res.json({ nftsMinted });
}

export { init, getNftCount };
