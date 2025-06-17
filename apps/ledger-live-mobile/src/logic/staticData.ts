import { Account, AccountLike, ProtoNFT } from "@ledgerhq/types-live";
import { BigNumber } from "bignumber.js";

// This structure matches the real Account type from @ledgerhq/types-live
const BTC_1: Account = {
  type: "Account",
  id: "static-btc-1",
  seedIdentifier: "static-btc-1",
  derivationMode: "segwit",
  index: 0,
  freshAddress: "1Cz2ZXb6Y6Aacb3B4xTj9uy422i626N4J5",
  freshAddressPath: "84'/0'/0'/0/0",
  used: true,
  balance: new BigNumber("150000000"), // 1.5 BTC in satoshis
  spendableBalance: new BigNumber("150000000"),
  creationDate: new Date("2023-01-01"),
  blockHeight: 800000,
  currency: {
    type: "CryptoCurrency",
    id: "bitcoin",
    coinType: 0,
    name: "Bitcoin",
    managerAppName: "Bitcoin",
    ticker: "BTC",
    scheme: "bitcoin",
    color: "#ffae35",
    family: "bitcoin",
    keywords: ["btc", "bitcoin"],
    units: [
      { name: "satoshi", code: "sat", magnitude: 0 },
      { name: "BTC", code: "BTC", magnitude: 8 },
    ],
    explorerViews: [{ tx: "https://blockstream.info/tx/$hash" }],
  },
  operationsCount: 0,
  operations: [],
  pendingOperations: [],
  lastSyncDate: new Date(),
  balanceHistoryCache: {
    HOUR: { latestDate: null, balances: [] },
    DAY: { latestDate: null, balances: [] },
    WEEK: { latestDate: null, balances: [] },
  },
  swapHistory: [],
};

// The list of all static accounts you want to display.
export const staticAccounts: Account[] = [BTC_1];

// This object will overwrite parts of the settings state.
export const staticSettings = {
  // This is the simplest way to get a "device connected" indicator.
  // It tricks the app into thinking a device has been successfully used.
  lastConnectedDevice: {
    deviceId: "static_device",
    modelId: "nanoX",
    productName: "Ledger Nano X",
    latestFirmware: {
      "final": {
        name: "2.2.3"
      }
    }
  },
  hasCompletedOnboarding: true,
};

// This provides the price for your static assets.
export const staticCountervalues = {
  bitcoin: {
    USD: 65000.0,
  },
}; 