import { internal, SendMode, Address, Cell, beginCell, toNano } from "ton-core";
import { OpenedWallet } from "utils";
import { NftCollection } from "./NftCollection";
import { TonClient } from "ton";


export type mintParams = {
    queryId: number | null,
    itemOwnerAddress: Address,
    itemIndex: number,
    amount: bigint,
    commonContentUrl: string,
    imageLink: string
  }



export class NftItem {
  private collection_address: Address;

  constructor(collection_address: Address | string) {
    if (typeof collection_address === "string") {
      this.collection_address = Address.parse(collection_address);
    } else {
    this.collection_address = collection_address;
  } 
  }

  public async deploy(
    wallet: OpenedWallet,
    params: mintParams
  ): Promise<number> {
    const seqno = await wallet.contract.getSeqno();
    await wallet.contract.sendTransfer({
      seqno,
      secretKey: wallet.keyPair.secretKey,
      messages: [
        internal({
          value: "0.05",
          to: this.collection_address,
          body: this.createMintBody(params),
        }),
      ],
      sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
    });
    return seqno;
  }

  static async getAddressByIndex(
    collectionAddress: Address | string,
    itemIndex: number
  ): Promise<Address> {
    if (typeof collectionAddress === "string") {
      collectionAddress = Address.parse(collectionAddress);
    }

    const client = new TonClient({
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
      apiKey: process.env.TONCENTER_API_KEY});
    
    const response = await client.runMethod(
        collectionAddress,
        "get_nft_address_by_index",
        [{ type: "int", value: BigInt(itemIndex) }]
      );
    return response.stack.readAddress();  
    
    }



    static async transfer(
        wallet: OpenedWallet,
        nftAddress: Address,
        newOwner: Address | string
      ): Promise<number> {
        console.log("newOwner address at the very start ", typeof newOwner)
        
        // Convert newOwner to Address if it's a string
        if (typeof newOwner === "string") {
          newOwner = Address.parse(newOwner);
        }

        console.log("newOwner address is string: ", typeof newOwner === "string")
        console.log("newOwner from NftItem.ts/transfer function ", newOwner)
        
        const seqno = await wallet.contract.getSeqno();
    
        await wallet.contract.sendTransfer({
          seqno,
          secretKey: wallet.keyPair.secretKey,
          messages: [
            internal({
              value: "0.05",
              to: nftAddress,
              body: this.createTransferBody({
                newOwner,
                responseTo: wallet.contract.address,
                forwardAmount: toNano("0.02"),
              }),
            }),
          ],
          sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
        });
        return seqno;
      }

    
    public async topUpBalance(
        wallet: OpenedWallet
      ): Promise<number> {
        const feeAmount = 0.026 // approximate value of fees for 1 transaction in our case 
        const seqno = await wallet.contract.getSeqno();
        const amount = feeAmount;
    
        await wallet.contract.sendTransfer({
          seqno,
          secretKey: wallet.keyPair.secretKey,
          messages: [
            internal({
              value: amount.toString(),
              to: this.collection_address.toString({ bounceable: false }),
              body: new Cell(),
            }),
          ],
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        });
    
        return seqno;
      }


    static createTransferBody(params: {
        newOwner: Address;
        responseTo?: Address;
        forwardAmount?: bigint;
      }): Cell {
        const msgBody = beginCell();
        msgBody.storeUint(0x5fcc3d14, 32); // op-code 
        msgBody.storeUint(0, 64); // query-id
        msgBody.storeAddress(params.newOwner);

        msgBody.storeAddress(params.responseTo || null);
        msgBody.storeBit(false); // no custom payload
        msgBody.storeCoins(params.forwardAmount || 0);
        msgBody.storeBit(0); // no forward_payload 

        return msgBody.endCell();
    
      }

    public createMintBody(params: mintParams): Cell {
        const body = beginCell();
        body.storeUint(1, 32);
        body.storeUint(params.queryId || 0, 64);
        body.storeUint(params.itemIndex, 64);
        body.storeCoins(params.amount);
    
        const nftItemContent = beginCell();
        nftItemContent.storeAddress(params.itemOwnerAddress);
    
        const uriContent = beginCell();
        uriContent.storeBuffer(Buffer.from(params.commonContentUrl));
        nftItemContent.storeRef(uriContent.endCell());
    
        body.storeRef(nftItemContent.endCell());
        return body.endCell();
      }
  }

