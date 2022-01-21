const {
  LCDClient,
  Dec,
  MsgExecuteContract,
  isTxError,
  Int,
  MnemonicKey,
  Wallet,
  StdFee,
} = require("@terra-money/terra.js");

const {
  MAINNET_OPTIONS,
  TESTNET_OPTIONS,
} = require("./config");

const base64 = require('base-64');
const MICRO = 1_000_000;

const autoStake = async (mnemonicKeyStr, network, qty, mAssetType, slippageTolerance) => {
  /*----------------- setting ------------------------------------------------*/
  const mnemonic = new MnemonicKey({ mnemonic: mnemonicKeyStr });

  if (network === "testnet")
  {
    config = TESTNET_OPTIONS;
  } else if (network === "mainnet"){
    config = MAINNET_OPTIONS;
  }
  else 
  {
    console.log("ERROR: network must be 'testnet' or 'mainnet'");
    return;
  }

  const lcd = new LCDClient({
    URL: config.URL,
    chainID: config.chainID,
  });
  
  const mAsset = config.assets.find((value) => {
    return (value.symbol === mAssetType )
  });

  if (mAsset === 'undefined') {
    console.log("ERROR: incorrect mAsset name")
    return;
  }

  const wallet = lcd.wallet(mnemonic);
  
  /*------------------ calculate pool price ---------------------------------*/
  console.log("STEP1: calcuate pool price... ");

  const assets = await lcd.wasm.contractQuery(
    mAsset.pair, // "terra1a06dgl27rhujjphsn4drl242ufws267qxypptx", "terra1t6xe0txzywdg85n6k8c960cuwgh6l8esw6lau9",
    {
      pool: {},
    }
  );

  const poolPrice = new Dec(assets.assets[0].amount).div(
    assets.assets[1].amount
  );

  console.log("*****SUCCESS*****");
  /*------------------ increase allowance ---------------------------------*/

  console.log("STEP2: increase allowance... ");

  const increase_allowance = new MsgExecuteContract(
    wallet.key.accAddress,
    mAsset.token,
    {
      increase_allowance: {
        amount: new Int(new Dec(qty).mul(MICRO)).toString(),
        spender: config.staking,
      },
    }
  );

  // Sign transaction
  try {
    const tx1 = await wallet.createAndSignTx({
      msgs: [increase_allowance],
      memo: "deposited into maui pool",
      gasPrices: { uusd: 0.15 },
    });

    // Broadcast transaction and check result
    await lcd.tx.broadcast(tx1);
  } catch {
    console.log("ERR");
    return;
  }
  console.log("*****SUCCESS*****");

  /*------------------ staking ---------------------------------*/

  console.log("STEP3: stake... ");

  const assetAmount = new Int(new Dec(qty).mul(MICRO));
  const ustAmount = new Int(new Dec(qty).mul(MICRO).mul(poolPrice));

  const autostake_contract = new MsgExecuteContract(
    wallet.key.accAddress,
    config.staking, // smart contract address of staking
    {
      auto_stake: {
        assets: [
          {
            amount: assetAmount.toString(),
            info: {
              token: {
                contract_addr: mAsset.token,
              },
            },
          },
          {
            amount: ustAmount.toString(),
            info: {
              native_token: {
                denom: "uusd",
              },
            },
          },
        ],
        slippage_tolerance: (slippageTolerance / 100).toString(),
      },
    },
    {
      uusd: ustAmount.toString(),
    }
  );

  // Sign transaction

  try {
    const tx2 = await wallet.createAndSignTx({
      msgs: [autostake_contract],
      memo: "deposited into maui pool",
      gasPrices: { uusd: 0.15 },
    });

    
    // Broadcast transaction and check result
    await lcd.tx.broadcast(tx2);
  }
  catch {
    console.log("ERROR: Maybe your mAsset or UST amount is not enough")
    return;
  }



  console.log("*****SUCCESS*****");
};

const withdraw = async (mnemonicKeyStr, network, qty, mAssetType)  => {
  /*----------------- setting ------------------------------------------------*/
  const mnemonic = new MnemonicKey({ mnemonic: mnemonicKeyStr });

  if (network === "testnet")
  {
    config = TESTNET_OPTIONS;
  } else if (network === "mainnet"){
    config = MAINNET_OPTIONS;
  }
  else 
  {
    console.log("ERROR: network must be 'testnet' or 'mainnet'");
    return;
  }

  const lcd = new LCDClient({
    URL: config.URL,
    chainID: config.chainID,
  });
  
  const mAsset = config.assets.find((value) => {
    return (value.symbol === mAssetType )
  });

  if (mAsset === 'undefined') {
    console.log("ERROR: incorrect mAsset name")
    return;
  }

  const wallet = lcd.wallet(mnemonic);

  /*------------------ unbonding ---------------------------------*/

  console.log("STEP1: unbond... ");
  const unbond_contract = new MsgExecuteContract(
    wallet.key.accAddress,
    config.staking,
    {
      unbond: {
        amount: new Int(new Dec(qty).mul(MICRO)).toString(),
        asset_token: mAsset.token,
      },
    }
  );

  // Sign transaction
  try {
    const tx1 = await wallet.createAndSignTx({
      msgs: [unbond_contract],
      memo: "deposited into maui pool",
      gasPrices: { uusd: 0.15 },
    });

    // Broadcast transaction and check result
    await lcd.tx.broadcast(tx1);
  }
  catch {
    console.log("ERROR: Maybe your withdrawal amount is large than mAsset/UST")
    return;
  }
  console.log("*****SUCCESS*****");

  /*------------------ sending ---------------------------------*/
  console.log("STEP1: sending... ");

  const sending_contract = new MsgExecuteContract(
    wallet.key.accAddress,
    mAsset.lpToken,
    {
    send: {
      amount: new Int(new Dec(qty).mul(MICRO)).toString(),
      contract: mAsset.pair,
      msg: base64.encode( '{"withdraw_liquidity":{}}' ) //"eyJ3aXRoZHJhd19saXF1aWRpdHkiOnt9fQ=="
    }
  }
  );

  // Sign transaction
  try {
    const tx2 = await wallet.createAndSignTx({
      msgs: [sending_contract],
      memo: "deposited into maui pool",
      gasPrices: { uusd: 0.15 },
    });

    // Broadcast transaction and check result
    await lcd.tx.broadcast(tx2);
    console.log("*****SUCCESS*****");
  }
  catch {
    console.log("ERROR: Maybe your LP token is not enough")
    return;
  }

}

autoStake("question solar spread moral novel rival diet turtle royal tree armor ozone dish enough electric job slogan snow occur spray volcano aisle strong fiction", "testnet", 1, "mAAPL", 1);
// withdraw("question solar spread moral novel rival diet turtle royal tree armor ozone dish enough electric job slogan snow occur spray volcano aisle strong fiction", "testnet", 1000, "mAAPL");