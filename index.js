// Run this with Node 14+

// See config objec for environment configuration
// See doEverything() function for full file lifecycle

// BrowserProvider uses global Websocket name (a no no!)
import Websocket from 'isomorphic-ws';
global.WebSocket = Websocket;

import LotusRPC from '@filecoin-shipyard/lotus-client-rpc';
import BrowserProvider from '@filecoin-shipyard/lotus-client-provider-browser';
import schema from '@filecoin-shipyard/lotus-client-schema/prototype/testnet-v3.js';
import IpfsHttpClient from "ipfs-http-client";
import FilecoinNumberDefaultExport from "@openworklabs/filecoin-number";
const FilecoinNumber = FilecoinNumberDefaultExport.FilecoinNumber; // Because Node 14

import BL from 'bl';
const BufferList = BL.BufferList; // Because Node 14

import fs from "fs";
import tmp from "tmp";
import {dealstates, terminalStates} from './dealstates.js';

var config = {
  httpProto: "http",
  wsProto: "ws",
  ipfsHost: "localhost",
  ipfsPort: "5001",
  lotusHost: "localhost",
  lotusPort: "7777",
  testFile: "./proxy.js",
  reallyGrossHostFileSystemPathThatClientShouldNeverHaveToKnow: "/tmp",
};
var wsUrl = config.wsProto + "://" + config.lotusHost + ":" + config.lotusPort + "/0/node/rpc/v0";

var provider = new BrowserProvider(wsUrl);
var client = new LotusRPC(provider, { schema: schema });

const ipfs = IpfsHttpClient({
  host: config.ipfsHost,
  port: config.ipfsPort,
  protocol: config.httpProto,
  apiPath: "/api/v0" 
})

async function doEverything() {
  // Get everything set up / get our bearings
  var result = await client.chainHead();

  console.log("Found Lotus chain: " + result.Cids[0]['/']);
  console.log("Height:\t" + result.Height);

  const miners = await client.stateListMiners([]);

  console.log("Miner:\t" + miners[0]);

  const defaultWalletAddress = await client.walletDefaultAddress();

  console.log("Default wallet: " + defaultWalletAddress);

  const balance = await client.walletBalance(defaultWalletAddress);

  // FilecoinNumber is used to parse balances, much like BigNumber
  console.log("Balance: " + new FilecoinNumber(balance, 'attofil'));
  console.log("");

  // Before making a storage proposal to Filecoin, we first need to add
  // the file to the attached IPFS server, and get the file's CID
  console.log("Sending " + config.testFile + " to IPFS...");
  var data = fs.readFileSync(config.testFile);

  var result = [];
  for await (const file of await ipfs.add(data)) {
    result.push(file);
  };

  var cid = result[0].path;
  console.log("CID: " + cid);

  console.log("");

  // Now we can create the storage proposal. 
  // This is like creating a transaction in Ethereum
  console.log("Creating storage proposal...");

  const storageProposal = {
    Data: {
      TransferType: 'graphsync',
      Root: {
        '/': cid
      },
      PieceCid: null,
      PieceSize: 0
    },
    Wallet: defaultWalletAddress,
    Miner: miners[0],
    EpochPrice: "2500",
    MinBlocksDuration: 300
  };

  // Here's where we actually send the proposal 
  const proposalResult = await client.clientStartDeal(storageProposal);
  console.log("Proposal CID: " + proposalResult['/']);

  console.log("");
  console.log("Waiting for proposal to be active...");

  // The proposal needs to be mined. Let's wait for that to happen.
  await waitForDealToFinish(proposalResult['/']);

  console.log("");
  console.log("Starting retrievals process:");
  console.log("");
  console.log("Checking to see if our node has the file locally...");

  // Check if the node we're talking to has the file locally
  // If so, we could skip the offer step if we wanted to.
  const hasLocal = await client.clientHasLocal({ '/': cid });

  if (hasLocal) {
    console.log("\t...duh, of course it does. We just uploaded it!");
    console.log("\t\t---> Honeybadger don't care, we're still gonna do normal a retrieval offer.");
  } else {
    console.log("Nope! We should probably understand why... oh well.");
  }

  console.log("");
  console.log("Getting remote offer...");
  console.log("")

  const offers = await client.clientFindData({ '/': cid });
  const remoteOffer = offers[0];

  console.log("\tOffer from: " + remoteOffer.Miner);
  console.log("\tRetrieval price: " + remoteOffer.MinPrice)

  console.log("");
  console.log("Accepting retrieval offer...");

  const randomId = Math.floor(
    Math.random() * Number.MAX_SAFE_INTEGER
  )

  const retrievalOffer = {
    Root: remoteOffer.Root,
    Size: remoteOffer.Size,
    Total: remoteOffer.MinPrice,
    PaymentInterval: remoteOffer.PaymentInterval,
    PaymentIntervalIncrease: remoteOffer.PaymentIntervalIncrease,
    Client: defaultWalletAddress,
    Miner: remoteOffer.Miner,
    MinerPeerID: remoteOffer.MinerPeerID
  };
  const fileRef = {
    Path: `/${config.reallyGrossHostFileSystemPathThatClientShouldNeverHaveToKnow}/${cid}`,
    IsCAR: false
  };

  const offerResult = await client.clientRetrieve(
    retrievalOffer,
    fileRef
  )

  console.log("")
  console.log("LOOK HERE! This is where things get a little tricky.")
  console.log("Word on the stree is that the Lotus devs are still working,")
  console.log("and what happens from here is slightly undefined. There's a")
  console.log("new feature as of May 26th that'll take the retrieved file")
  console.log("and push it to the attached IPFS node. We're not there yet,")
  console.log("but it's close. You can see the github PR here:")
  console.log("")
  console.log("https://github.com/filecoin-project/lotus/pull/1843");
  console.log("");
  console.log("So we're just gonna act like that's what just happened.");
  console.log("The only issue is that we *just* uploaded the file to IPFS")
  console.log("so it's not the most amazing example. Either way, it's the");
  console.log("future! We'll just have to deal with it for now. Cheers!");

  // Now that the file is on the IPFS node (wink wink), let's pull it down.
  // We'll stick it in a temp file and then compare the source file to the
  // downloaded file to ensure they're the same.
  console.log("");
  console.log("Getting file from IPFS node...");

  const tmpobj = tmp.dirSync();

  var d = await ipfs.get(cid);

  var result = [];
  for await (const file of await ipfs.get(cid)) {
    result.push(file);
  };

  var fileData = result[0];

  const content = new BufferList();

  for await (const chunk of fileData.content) {
    content.append(chunk)
  }

  console.log("Writing file to temp dir...");

  const tmpfilePath = tmpobj.name + "/" + fileData.path;

  fs.writeFileSync(tmpfilePath, content.toString());

  console.log("");
  console.log("Comparing source file and temp file via the round trip...");

  var sourceFileContent = fs.readFileSync(config.testFile, {encoding: "utf-8"});
  var downloadedFileContent = fs.readFileSync(tmpfilePath, {encoding: "utf-8"});

  console.log("")
  if (sourceFileContent == downloadedFileContent) {
    console.log("\t-- YAY! Downloaded file was the same as the test file! --");
  } else {
    throw new Error("UH OH! Files didn't match. Something went wrong.");
  }
}

async function getDealState(dealCid) {
  const clientDeals = await client.clientListDeals();

  const [deal] = clientDeals.filter((d) => {
    return d.ProposalCid['/'] == dealCid;
  });

  return dealstates[deal.State];
}

async function waitForDealToFinish(dealCid) {
  var accept, reject;
  var p = new Promise((a, r) => {accept = a; reject = r;});

  var interval = setInterval(async () => {
    var state = await getDealState(dealCid);
    console.log("Current state: " + state);

    if (state == "Active") {
      clearInterval(interval);
      return accept(state);
    } else if (terminalStates.has(dealstates.indexOf(state))) {
      return reject(new Error("Deal failed with state: " + dealstates[state]));
    }
  }, 1000)

  return p; 
}

doEverything().then(() => {
  console.log("");
  console.log("All's well that ends well. See ya!");
  process.exit(); // Something is holding the process open
}).catch((e) => {
  console.error(e);
  process.exit(1); // Something is holding the process open
});