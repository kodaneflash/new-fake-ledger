# Static Data Modification Guide

This document outlines the changes made to the Ledger Live Mobile application to enable a "Static Data Mode". This mode bypasses live data synchronization and instead injects a predefined, static set of accounts and settings into the app at launch.

## 1. New File: Static Data Source

A new file was created to act as the single source of truth for all static data.

**File Location:** `
apps/ledger-live-mobile/src/logic/staticData.ts`

**Purpose:** This file defines the static accounts, settings (including the "device connected" state), and countervalues (prices) to be used in static mode.

**Content:**
```typescript
import { Account, AccountLike } from "@ledgerhq/types-live";
import { BigNumber } from "bignumber.js";

// This is a simplified structure. You may need to add more fields
// to match the real Account type for full feature compatibility.
const BTC_1: Account = {
  type: "Account",
  id: "static-btc-1",
  seedIdentifier: "static-btc-1",
  derivationMode: "segwit",
  index: 0,
  freshAddress: "1Cz2ZXb6Y6Aacb3B4xTj9uy422i626N4J5",
  freshAddressPath: "84'/0'/0'/0/0",
  freshAddresses: [],
  name: "Bitcoin 1 (Static)",
  starred: true,
  balance: new BigNumber("150000000"), // 1.5 BTC in satoshis
  spendableBalance: new BigNumber("150000000"),
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
    units: [
      { name: "satoshi", code: "sat", magnitude: 0 },
      { name: "BTC", code: "BTC", magnitude: 8 },
    ],
    explorerViews: [{ tx: "https://blockstream.info/tx/{hash}" }],
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
export const staticAccounts: AccountLike[] = [BTC_1];

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
```

---

## 2. Modification: App Entry Point

The main application component was modified to inject the static data on startup and prevent it from being overwritten by the app's normal data sync logic.

**File Location:** `apps/ledger-live-mobile/src/index.tsx`

### Change 1: Import Static Data and Define Control Flag

The following lines were added near the top of the file to import the necessary data/actions and to provide a simple toggle to enable or disable the static mode.

```typescript
// ... after other imports
import { staticAccounts, staticSettings } from "~/logic/staticData";
import { setAccounts } from "~/actions/accounts";
import { importSettings } from "~/actions/settings";

const USE_STATIC_DATA = true; // Set this to false to disable static data
```

### Change 2: Inject Data on App Launch

This `useEffect` hook was added inside the `App()` component to dispatch the actions that populate the Redux store with the static data.

```typescript
// ... inside App() component, after dispatch is defined
  useEffect(() => {
    if (USE_STATIC_DATA) {
      // @ts-expect-error Trust me bro
      dispatch(setAccounts(staticAccounts));
      // @ts-expect-error Trust me bro
      dispatch(importSettings(staticSettings));
    }
  }, [dispatch]);
```

### Change 3: Disable Automatic Synchronization

The `<SyncNewAccounts />` component, which is responsible for fetching live data, was wrapped in a condition to disable it when `USE_STATIC_DATA` is `true`.

```jsx
// ... inside the return statement of the App() component
  return (
    <GestureHandlerRootView style={styles.root}>
      {!USE_STATIC_DATA && <SyncNewAccounts priority={5} />}
      <TransactionsAlerts />
//...
``` 