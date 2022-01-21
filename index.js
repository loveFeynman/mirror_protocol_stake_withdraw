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
  Mirror,
  DEFAULT_BOMBAY_MIRROR_OPTIONS,
  DEFAULT_MIRROR_OPTIONS,
} = require("@mirror-protocol/mirror.js");

const base64 = require('base-64');

const MICRO = 1_000_000;

const testnet_config = {
  mnemonicKey:
    "question solar spread moral novel rival diet turtle royal tree armor ozone dish enough electric job slogan snow occur spray volcano aisle strong fiction",
  URL: "https://bombay-lcd.terra.dev",
  chainID: "bombay-12",
  stakingAddress: "terra1a06dgl27rhujjphsn4drl242ufws267qxypptx",
  options: DEFAULT_BOMBAY_MIRROR_OPTIONS,
};

const mainnet_config = {
  mnemonicKey:
    "question solar spread moral novel rival diet turtle royal tree armor ozone dish enough electric job slogan snow occur spray volcano aisle strong fiction",
  URL: "https://bombay-lcd.terra.dev",
  chainID: "bombay-12",
  stakingAddress: "terra17f7zu97865jmknk7p2glqvxzhduk78772ezac5",
  options: DEFAULT_MIRROR_OPTIONS,
};

const config = testnet_config;

const lcd = new LCDClient({
  URL: config.URL,
  chainID: config.chainID,
});

const mnemonic = new MnemonicKey({ mnemonic: config.mnemonicKey });

let options = config.options; // omit it for testnet
options.key = new MnemonicKey({ mnemonic: config.mnemonicKey });
const mirror = new Mirror(options);
const wallet = lcd.wallet(mnemonic);

const autoStake = async (qty) => {
  const { mAAPL } = mirror.assets;

  /*------------------ calculate pool price ---------------------------------*/
  console.log("STEP1: calcuate pool price... ");

  const assets = await lcd.wasm.contractQuery(
    mAAPL.pair.contractAddress, // "terra1a06dgl27rhujjphsn4drl242ufws267qxypptx", "terra1t6xe0txzywdg85n6k8c960cuwgh6l8esw6lau9",
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
    mAAPL.token.contractAddress,
    {
      increase_allowance: {
        amount: new Int(new Dec(qty).mul(MICRO)).toString(),
        spender: config.stakingAddress,
      },
    }
  );

  // Sign transaction
  const tx1 = await wallet.createAndSignTx({
    msgs: [increase_allowance],
    memo: "deposited into maui pool",
    gasPrices: { uusd: 0.15 },
  });

  // Broadcast transaction and check result
  await lcd.tx.broadcast(tx1).then((txResult) => {
    if (isTxError(txResult)) {
      throw new Error(
        `encountered an error while running the transaction: ${txResult}`
      );
    }
  });
  console.log("*****SUCCESS*****");

  /*------------------ staking ---------------------------------*/

  console.log("STEP3: stake... ");

  const assetAmount = new Int(new Dec(qty).mul(MICRO));
  const ustAmount = new Int(new Dec(qty).mul(MICRO).mul(poolPrice));

  const autostake_contract = new MsgExecuteContract(
    wallet.key.accAddress,
    config.stakingAddress, // terra17f7zu97865jmknk7p2glqvxzhduk78772ezac5,   // smart contract address of staking for testnet and mainnet
    {
      auto_stake: {
        assets: [
          {
            amount: assetAmount.toString(),
            info: {
              token: {
                contract_addr: mAAPL.token.contractAddress,
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
        slippage_tolerance: "0.01",
      },
    },
    {
      uusd: ustAmount.toString(),
    }
  );

  // Sign transaction
  const tx2 = await wallet.createAndSignTx({
    msgs: [autostake_contract],
    memo: "deposited into maui pool",
    gasPrices: { uusd: 0.15 },
  });

  // Broadcast transaction and check result
  await lcd.tx.broadcast(tx2).then((txResult) => {
    if (isTxError(txResult)) {
      throw new Error(
        `encountered an error while running the transaction: ${txResult}`
      );
    }
  });

  console.log("*****SUCCESS*****");
};

const withdraw = async (qty)  => {
  const { mAAPL } = mirror.assets;
  /*------------------ unbonding ---------------------------------*/

  console.log("STEP1: unbond... ");
  const unbond_contract = new MsgExecuteContract(
    wallet.key.accAddress,
    config.stakingAddress,
    {
      unbond: {
        amount: new Int(new Dec(qty).mul(MICRO)).toString(),
        asset_token: mAAPL.token.contractAddress,
      },
    }
  );

  // Sign transaction
  const tx1 = await wallet.createAndSignTx({
    msgs: [unbond_contract],
    memo: "deposited into maui pool",
    gasPrices: { uusd: 0.15 },
  });

  // Broadcast transaction and check result
  await lcd.tx.broadcast(tx1).then((txResult) => {
    if (isTxError(txResult)) {
      throw new Error(
        `encountered an error while running the transaction: ${txResult}`
      );
    }
  });
  console.log("*****SUCCESS*****");

  /*------------------ sending ---------------------------------*/

  const sending_contract = new MsgExecuteContract(
    wallet.key.accAddress,
    mAAPL.lpToken.contractAddress,
    {
    send: {
      amount: new Int(new Dec(qty).mul(MICRO)).toString(),
      contract: mAAPL.pair.contractAddress,
      msg: base64.encode( '{"withdraw_liquidity":{}}' ) //"eyJ3aXRoZHJhd19saXF1aWRpdHkiOnt9fQ=="
    }
  }
  );

  // Sign transaction
  const tx2 = await wallet.createAndSignTx({
    msgs: [sending_contract],
    memo: "deposited into maui pool",
    gasPrices: { uusd: 0.15 },
  });

  // Broadcast transaction and check result
  await lcd.tx.broadcast(tx2).then((txResult) => {
    if (isTxError(txResult)) {
      throw new Error(
        `encountered an error while running the transaction: ${txResult}`
      );
    }
  });
  console.log("*****SUCCESS*****");
}

// autoStake(1);
withdraw(1);