// NB this new "bridge" is a re-take of live-desktop bridge ideas
// with a focus to eventually make it shared across both projects.
// a WalletBridge is implemented on renderer side.
// this is an abstraction on top of underlying blockchains api (libcore / ethereumjs / ripple js / ...)
// that would directly be called from UI needs.
import { BigNumber } from "bignumber.js";
import type { Observable } from "rxjs";
import type { CryptoCurrency, Unit } from "@ledgerhq/types-cryptoassets";
import type { DeviceModelId } from "@ledgerhq/types-devices";
import type { AccountLike, Account, AccountRaw, TokenAccount, TokenAccountRaw } from "./account";
import type {
  SignOperationEvent,
  SignedOperation,
  TransactionCommon,
  TransactionStatusCommon,
} from "./transaction";
import type { Operation, OperationExtra, OperationExtraRaw } from "./operation";
import type { DerivationMode } from "./derivation";
import type { SyncConfig } from "./pagination";
import { CryptoCurrencyIds, NFTCollectionMetadataResponse, NFTMetadataResponse } from "./nft";

export type ScanAccountEvent = {
  type: "discovered";
  account: Account;
};
/**
 * More events will come in the future
 */
export type ScanAccountEventRaw = {
  type: "discovered";
  account: AccountRaw;
};

/**
 * Unique identifier of a device. It will depend on the underlying implementation.
 */
export type DeviceId = string;

/**
 *
 */
export type PreloadStrategy = Partial<{
  preloadMaxAge: number;
}>;

export type BroadcastConfig = {
  mevProtected: boolean;
};

/**
 *
 */
export type BroadcastArg<A extends Account> = {
  account: A;
  signedOperation: SignedOperation;
  broadcastConfig?: BroadcastConfig;
};

/**
 *
 */
export type SignOperationArg0<T extends TransactionCommon, A extends Account> = {
  account: A;
  transaction: T;
  deviceId: DeviceId;
  deviceModelId?: DeviceModelId;
  certificateSignatureKind?: "prod" | "test";
};

/**
 *
 */
export type SignOperationFnSignature<T extends TransactionCommon, A extends Account> = (
  arg0: SignOperationArg0<T, A>,
) => Observable<SignOperationEvent>;

export type BroadcastFnSignature<A extends Account = Account> = (
  arg0: BroadcastArg<A>,
) => Promise<Operation>;

export type Bridge<
  T extends TransactionCommon,
  A extends Account = Account,
  U extends TransactionStatusCommon = TransactionStatusCommon,
  O extends Operation = Operation,
  R extends AccountRaw = AccountRaw,
> = {
  currencyBridge: CurrencyBridge;
  accountBridge: AccountBridge<T, A, U, O, R>;
};

export type ScanInfo = {
  currency: CryptoCurrency;
  deviceId: DeviceId;
  scheme?: DerivationMode | null | undefined;
  syncConfig: SyncConfig;
  preferredNewAccountScheme?: DerivationMode;
};

/**
 * Abstraction related to a currency
 */
export interface CurrencyBridge {
  // Preload data required for the bridges to work. (e.g. tokens, delegators,...)
  // Assume to call it at every load time but as lazy as possible (if user have such account already AND/OR if user is about to scanAccounts)
  // returned value is a serializable object
  // fail if data was not able to load.
  preload(currency: CryptoCurrency): Promise<Record<string, any> | Array<unknown> | void>;
  // reinject the preloaded data (typically if it was cached)
  // method need to treat the data object as unsafe and validate all fields / be backward compatible.
  hydrate(data: unknown, currency: CryptoCurrency): void;
  // Scan all available accounts with a device
  scanAccounts(info: ScanInfo): Observable<ScanAccountEvent>;
  getPreloadStrategy?: (currency: CryptoCurrency) => PreloadStrategy;
  nftResolvers?: {
    nftMetadata: (arg: {
      contract: string;
      tokenId: string;
      currencyId: string;
    }) => Promise<NFTMetadataResponse>;
    collectionMetadata: (arg: {
      contract: string;
      currencyId: string;
    }) => Promise<NFTCollectionMetadataResponse>;
  };
}

/**
 * Abstraction related to an account
 */
interface SendReceiveAccountBridge<
  T extends TransactionCommon,
  A extends Account = Account,
  U extends TransactionStatusCommon = TransactionStatusCommon,
> {
  // synchronizes an account continuously to update with latest blochchains state.
  // The function emits updater functions each time there are data changes (e.g. blockchains updates)
  // an update function is just a Account => Account that perform the changes (to avoid race condition issues)
  // initialAccount parameter is used to point which account is the synchronization on, but it should not be used in the emitted values.
  // the sync can be stopped at any time using Observable's subscription.unsubscribe()
  sync(initialAccount: A, syncConfig: SyncConfig): Observable<(arg0: A) => A>;
  receive(
    account: A,
    arg1: {
      verify?: boolean;
      deviceId: string;
      subAccountId?: string;
      freshAddressIndex?: number;
      path?: string;
    },
  ): Observable<{
    address: string;
    path: string;
    publicKey: string;
    chainCode?: string;
  }>;
  // a Transaction object is created on UI side as a black box to put all temporary information to build the transaction at the end.
  // There are a bunch of edit and get functions to edit and extract information out ot this black box.
  // it needs to be a serializable JS object
  createTransaction(account: AccountLike<A>): T;
  // NOTE: because of a dependency to React at the moment, if updateTransaction doesn't modify the transaction
  // it must return the unmodified input transaction object (reference stability)
  updateTransaction(t: T, patch: Partial<T>): T;
  // prepare the remaining missing part of a transaction typically from network (e.g. fees)
  // and fulfill it in a new transaction object that is returned (async)
  // It can fails if the the network is down.
  // NOTE: because of a dependency to React at the moment, if prepareTransaction doesn't modify the transaction
  // it must return the unmodified input transaction object (reference stability)
  prepareTransaction(account: A, transaction: T): Promise<T>;
  // calculate derived state of the Transaction, useful to display summary / errors / warnings. tells if the transaction is ready.
  getTransactionStatus(account: A, transaction: T): Promise<U>;
  // heuristic that provides the estimated max amount that can be set to a send.
  // this is usually the balance minus the fees, but it really depends between coins (reserve, burn, frozen part of the balance,...).
  // it is a heuristic in that this is not necessarily correct and it can be +-delta (so the info can exceed the spendable or leave some dust).
  // it's used as informative UI and also used for "dry run" approaches, but it shouldn't be used to determine the final SEND MAX amount.
  // it returns an amount in the account unit
  // if a transaction is provided, it can be used to precise the information
  // if it not provided, you can assume to take the worst-case scenario (like sending all UTXOs to a legacy address has higher fees resulting in a lower max spendable)
  estimateMaxSpendable(arg0: {
    account: AccountLike<A>;
    parentAccount?: A | null | undefined;
    transaction?: T | null | undefined;
  }): Promise<BigNumber>;
  /**
   * This function mutates the 'account' object to extend it with any extra fields of the coin.
   * For instance bitcoinResources needs to be created.
   *
   * @param {Account} account - The original account object to mutates in-place.
   */
  initAccount?: (account: A) => void;
  // finalizing a transaction by signing it with the ledger device
  // This results of a "signed" event with a signedOperation
  // than can be locally saved and later broadcasted
  signOperation: SignOperationFnSignature<T, A>;
  // broadcasting a signed transaction to network
  // returns an optimistic Operation that this transaction is likely to create in the future
  broadcast: BroadcastFnSignature<A>;
}

interface SerializationAccountBridge<
  A extends Account,
  O extends Operation = Operation,
  R extends AccountRaw = AccountRaw,
> {
  /**
   * This function mutates the 'accountRaw' object in-place to add any extra fields that the coin may need to set.
   * It is called during the serialization mechanism, for instance bitcoinResources need to be serialized.
   *
   * @param {Account} account - The original account object.
   * @param {AccountRaw} accountRaw - The account in its serialized form.
   */
  assignToAccountRaw: (account: A, accountRaw: R) => void;
  /**
   * This function mutates the 'account' object in-place to add any extra fields that the coin may need to set.
   * It is called during the deserialization mechanism, for instance bitcoinResources need to be deserialized.
   *
   * @param {AccountRaw} accountRaw - The account in its serialized form.
   * @param {Account} account - The original account object.
   */
  assignFromAccountRaw: (accountRaw: R, account: A) => void;
  /**
   * This function mutates the 'tokenAccountRaw' object in-place to add any extra fields that the coin may need to set.
   * It is called during the serialization mechanism
   *
   * @param {TokenAccount} tokenAccount - The original token account object.
   * @param {TokenAccountRaw} tokenAccountRaw - The token account in its serialized form.
   */
  assignToTokenAccountRaw: (tokenAccount: TokenAccount, tokenAccountRaw: TokenAccountRaw) => void;
  /**
   * This function mutates the 'tokenAccount' object in-place to add any extra fields that the coin may need to set.
   * It is called during the deserialization mechanism
   *
   * @param {TokenAccountRaw} tokenAccountRaw - The token account in its serialized form.
   * @param {TokenAccount} tokenAccount - The original token account object.
   */
  assignFromTokenAccountRaw?: (
    tokenAccountRaw: TokenAccountRaw,
    tokenAccount: TokenAccount,
  ) => void;
  fromOperationExtraRaw: (extraRaw: OperationExtraRaw) => OperationExtra;
  toOperationExtraRaw: (extra: OperationExtra) => OperationExtraRaw;
  formatAccountSpecifics: (account: A) => string;
  formatOperationSpecifics: (operation: O, unit: Unit | null | undefined) => string;
}

type AccountBridgeWithExchange<A extends Account = Account> = {
  getSerializedAddressParameters: (account: A, addressFormat?: string) => Buffer;
};

export type AccountBridge<
  T extends TransactionCommon,
  A extends Account = Account,
  U extends TransactionStatusCommon = TransactionStatusCommon,
  O extends Operation = Operation,
  R extends AccountRaw = AccountRaw,
> = SendReceiveAccountBridge<T, A, U> &
  AccountBridgeWithExchange<A> &
  Partial<SerializationAccountBridge<A, O, R>>;

type ExpectFn = (...args: Array<any>) => any;

type CurrencyTransaction<T extends TransactionCommon> = {
  name: string;
  transaction: T | ((transaction: T, account: Account, accountBridge: AccountBridge<T>) => T);
  expectedStatus?:
    | Partial<TransactionStatusCommon>
    | ((
        account: Account,
        transaction: T,
        status: TransactionStatusCommon,
      ) => Partial<TransactionStatusCommon>);
  test?: (arg0: ExpectFn, arg1: T, arg2: TransactionStatusCommon, arg3: AccountBridge<T>) => any;
  apdus?: string;
  testSignedOperation?: (
    arg0: ExpectFn,
    arg1: SignedOperation,
    arg2: Account,
    arg3: T,
    arg4: TransactionStatusCommon,
    arg5: AccountBridge<T>,
  ) => any;
};

export type AccountTestData<T extends TransactionCommon> = {
  raw: AccountRaw;
  implementations?: string[];
  FIXME_tests?: Array<string | RegExp>;
  transactions?: Array<CurrencyTransaction<T>>;
  test?: (arg0: ExpectFn, arg1: Account, arg2: AccountBridge<T>) => any;
};

/**
 *
 */
export type CurrenciesData<T extends TransactionCommon> = {
  FIXME_ignoreAccountFields?: string[];
  FIXME_ignoreOperationFields?: string[];
  FIXME_ignorePreloadFields?: string[] | true;
  IgnorePrepareTransactionFields?: string[];
  mockDeviceOptions?: any;
  scanAccounts?: Array<{
    name: string;
    apdus: string;
    unstableAccounts?: boolean;
    test?: (expect: ExpectFn, scanned: Account[], bridge: CurrencyBridge) => any;
  }>;
  accounts?: Array<AccountTestData<T>>;
  test?: (arg0: ExpectFn, arg1: CurrencyBridge) => any;
};

/**
 *
 */
export type DatasetTest<T extends TransactionCommon> = {
  implementations: string[];
  currencies: Record<CryptoCurrencyIds, CurrenciesData<T>> | Record<string, never>;
};

/**
 *
 */
export type BridgeCacheSystem = {
  hydrateCurrency: (currency: CryptoCurrency) => Promise<unknown | null | undefined>;
  prepareCurrency: (currency: CryptoCurrency) => Promise<unknown | null | undefined>;
};
