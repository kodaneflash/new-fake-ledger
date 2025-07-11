/* eslint-disable no-console */
import { RPCHandler, customWrapper } from "@ledgerhq/wallet-api-server";
import {
  createAccountNotFound,
  createCurrencyNotFound,
  deserializeTransaction,
  ServerError,
} from "@ledgerhq/wallet-api-core";
import {
  getParentAccount,
  getMainAccount,
  makeEmptyTokenAccount,
} from "@ledgerhq/coin-framework/account/index";
import { CryptoOrTokenCurrency } from "@ledgerhq/types-cryptoassets";
import { AccountLike, getCurrencyForAccount, TokenAccount } from "@ledgerhq/types-live";
import { findTokenById, listTokensForCryptoCurrency } from "@ledgerhq/cryptoassets";
import {
  ExchangeCompleteParams,
  ExchangeCompleteResult,
  ExchangeStartParams,
  ExchangeStartSwapParams,
  ExchangeStartResult,
  ExchangeType,
  ExchangeStartSellParams,
  SwapLiveError,
} from "@ledgerhq/wallet-api-exchange-module";
import { decodeSwapPayload } from "@ledgerhq/hw-app-exchange";
import { TrackingAPI } from "./tracking";
import { AppManifest } from "../types";
import {
  getAccountIdFromWalletAccountId,
  getWalletAPITransactionSignFlowInfos,
} from "../converters";
import { getAccountBridge } from "../../bridge";
import { Exchange } from "../../exchange/types";
import { Transaction } from "../../generated/types";
import {
  ExchangeError,
  createAccounIdNotFound,
  createWrongSellParams,
  createWrongSwapParams,
} from "./error";

export { ExchangeType };
import { BigNumber } from "bignumber.js";

type Handlers = {
  "custom.exchange.start": RPCHandler<
    ExchangeStartResult,
    ExchangeStartParams | ExchangeStartSwapParams | ExchangeStartSellParams
  >;
  "custom.exchange.complete": RPCHandler<ExchangeCompleteResult, ExchangeCompleteParams>;
  "custom.exchange.error": RPCHandler<void, SwapLiveError>;
  "custom.isReady": RPCHandler<void, void>;
};

export type CompleteExchangeUiRequest = {
  provider: string;
  exchange: Exchange;
  transaction: Transaction;
  binaryPayload: string;
  signature: string;
  feesStrategy: string;
  exchangeType: number;
  swapId?: string;
  amountExpectedTo?: number;
  magnitudeAwareRate?: BigNumber;
  refundAddress?: string;
  payoutAddress?: string;
};

type ExchangeStartParamsUiRequest =
  | {
      exchangeType: "FUND";
    }
  | {
      exchangeType: "SELL";
      provider: string;
      exchange: Partial<Exchange> | undefined;
    }
  | {
      exchangeType: "SWAP";
      provider: string;
      exchange: Partial<Exchange>;
    };

type ExchangeUiHooks = {
  "custom.exchange.start": (params: {
    exchangeParams: ExchangeStartParamsUiRequest;
    onSuccess: (nonce: string, device?: ExchangeStartResult["device"]) => void;
    onCancel: (error: Error, device?: ExchangeStartResult["device"]) => void;
  }) => void;
  "custom.exchange.complete": (params: {
    exchangeParams: CompleteExchangeUiRequest;
    onSuccess: (hash: string) => void;
    onCancel: (error: Error) => void;
  }) => void;
  "custom.exchange.error": (params: {
    error: SwapLiveError | undefined;
    onSuccess: () => void;
    onCancel: () => void;
  }) => void;
  "custom.isReady": (params: { onSuccess: () => void; onCancel: () => void }) => void;
};

export const handlers = ({
  accounts,
  tracking,
  manifest,
  uiHooks: {
    "custom.exchange.start": uiExchangeStart,
    "custom.exchange.complete": uiExchangeComplete,
    "custom.exchange.error": uiError,
    "custom.isReady": uiIsReady,
  },
}: {
  accounts: AccountLike[];
  tracking: TrackingAPI;
  manifest: AppManifest;
  uiHooks: ExchangeUiHooks;
}) =>
  ({
    "custom.exchange.start": customWrapper<ExchangeStartParams, ExchangeStartResult>(
      async params => {
        if (!params) {
          tracking.startExchangeNoParams(manifest);
          return { transactionId: "" };
        }

        const trackingParams = {
          // @ts-expect-error ExchangeStartFundParams does not yet have the provider. Will be added in another iteration after a bugfix is confirmed
          // TODO: expect-error to be deleted after
          provider: params.provider,
          exchangeType: params.exchangeType,
        };

        tracking.startExchangeRequested(trackingParams);

        let exchangeParams: ExchangeStartParamsUiRequest;

        // Use `if else` instead of switch to leverage TS type narrowing and avoid `params` force cast.
        if (params.exchangeType == "SWAP") {
          exchangeParams = extractSwapStartParam(params, accounts);
        } else if (params.exchangeType == "SELL") {
          exchangeParams = extractSellStartParam(params, accounts);
        } else {
          exchangeParams = {
            exchangeType: params.exchangeType,
          };
        }

        return new Promise((resolve, reject) =>
          uiExchangeStart({
            exchangeParams,
            onSuccess: (nonce: string, device) => {
              tracking.startExchangeSuccess(trackingParams);
              resolve({ transactionId: nonce, device });
            },
            onCancel: error => {
              tracking.startExchangeFail(trackingParams);
              reject(error);
            },
          }),
        );
      },
    ),
    "custom.exchange.complete": customWrapper<ExchangeCompleteParams, ExchangeCompleteResult>(
      async params => {
        if (!params) {
          tracking.completeExchangeNoParams(manifest);
          return { transactionHash: "" };
        }
        const trackingParams = {
          provider: params.provider,
          exchangeType: params.exchangeType,
        };
        tracking.completeExchangeRequested(trackingParams);

        const realFromAccountId = getAccountIdFromWalletAccountId(params.fromAccountId);
        if (!realFromAccountId) {
          return Promise.reject(new Error(`accountId ${params.fromAccountId} unknown`));
        }

        const fromAccount = accounts.find(acc => acc.id === realFromAccountId);

        if (!fromAccount) {
          throw new ServerError(createAccountNotFound(params.fromAccountId));
        }

        const fromParentAccount = getParentAccount(fromAccount, accounts);

        let exchange: Exchange;

        if (params.exchangeType === "SWAP") {
          const realToAccountId = getAccountIdFromWalletAccountId(params.toAccountId);
          if (!realToAccountId) {
            return Promise.reject(new Error(`accountId ${params.toAccountId} unknown`));
          }

          const toAccount = accounts.find(a => a.id === realToAccountId);

          if (!toAccount) {
            throw new ServerError(createAccountNotFound(params.toAccountId));
          }

          // TODO: check logic for EmptyTokenAccount
          let toParentAccount = getParentAccount(toAccount, accounts);
          let newTokenAccount: TokenAccount | undefined;
          if (params.tokenCurrency) {
            const currency = findTokenById(params.tokenCurrency);
            if (!currency) {
              throw new ServerError(createCurrencyNotFound(params.tokenCurrency));
            }
            if (toAccount.type === "Account") {
              newTokenAccount = makeEmptyTokenAccount(toAccount, currency);
              toParentAccount = toAccount;
            } else {
              newTokenAccount = makeEmptyTokenAccount(toParentAccount, currency);
            }
          }

          const toCurrency = await getToCurrency(
            params.hexBinaryPayload,
            toAccount,
            newTokenAccount,
          );

          exchange = {
            fromAccount,
            fromParentAccount,
            fromCurrency: getCurrencyForAccount(fromAccount),
            toAccount: newTokenAccount ? newTokenAccount : toAccount,
            toParentAccount,
            toCurrency,
          };
        } else {
          exchange = {
            fromAccount,
            fromParentAccount,
            fromCurrency: getCurrencyForAccount(fromAccount),
          };
        }

        const mainFromAccount = getMainAccount(fromAccount, fromParentAccount);
        const mainFromAccountFamily = mainFromAccount.currency.family;

        const transaction = deserializeTransaction(params.rawTransaction);

        const { liveTx } = getWalletAPITransactionSignFlowInfos({
          walletApiTransaction: transaction,
          account: fromAccount,
        });

        if (liveTx.family !== mainFromAccountFamily) {
          return Promise.reject(
            new Error(
              `Account and transaction must be from the same family. Account family: ${mainFromAccountFamily}, Transaction family: ${liveTx.family}`,
            ),
          );
        }

        const accountBridge = getAccountBridge(fromAccount, fromParentAccount);

        /**
         * 'subAccountId' is used for ETH and it's ERC-20 tokens.
         * This field is ignored for BTC
         */
        const subAccountId =
          fromParentAccount && fromParentAccount.id !== fromAccount.id ? fromAccount.id : undefined;

        const bridgeTx = accountBridge.createTransaction(fromAccount);
        /**
         * We append the `recipient` to the tx created from `createTransaction`
         * to avoid having userGasLimit reset to null for ETH txs
         * cf. libs/ledger-live-common/src/families/ethereum/updateTransaction.ts
         */
        const tx = accountBridge.updateTransaction(
          {
            ...bridgeTx,
            recipient: liveTx.recipient,
          },
          {
            ...liveTx,
            feesStrategy: params.feeStrategy.toLowerCase(),
            subAccountId,
          },
        );

        let amountExpectedTo;
        let magnitudeAwareRate;
        let refundAddress;
        let payoutAddress;
        if (params.exchangeType === "SWAP") {
          // Get amountExpectedTo and magnitudeAwareRate from binary payload
          const decodePayload = await decodeSwapPayload(params.hexBinaryPayload);
          amountExpectedTo = new BigNumber(decodePayload.amountToWallet.toString());
          magnitudeAwareRate = tx.amount && amountExpectedTo.dividedBy(tx.amount);
          refundAddress = decodePayload.refundAddress;
          payoutAddress = decodePayload.payoutAddress;
        }

        return new Promise((resolve, reject) =>
          uiExchangeComplete({
            exchangeParams: {
              exchangeType: ExchangeType[params.exchangeType],
              provider: params.provider,
              transaction: tx,
              signature: params.hexSignature,
              binaryPayload: params.hexBinaryPayload,
              exchange,
              feesStrategy: params.feeStrategy,
              swapId: params.exchangeType === "SWAP" ? params.swapId : undefined,
              amountExpectedTo,
              magnitudeAwareRate,
              refundAddress,
              payoutAddress,
            },
            onSuccess: (transactionHash: string) => {
              tracking.completeExchangeSuccess({
                ...trackingParams,
                currency: params.rawTransaction.family,
              });
              resolve({ transactionHash });
            },
            onCancel: error => {
              tracking.completeExchangeFail(trackingParams);
              reject(error);
            },
          }),
        );
      },
    ),
    "custom.exchange.error": customWrapper<SwapLiveError, void>(async params => {
      return new Promise((resolve, reject) =>
        uiError({
          error: params,
          onSuccess: () => {
            resolve();
          },
          onCancel: () => {
            reject();
          },
        }),
      );
    }),
    "custom.isReady": customWrapper<void, void>(async () => {
      return new Promise((resolve, reject) =>
        uiIsReady({
          onSuccess: () => {
            resolve();
          },
          onCancel: () => {
            reject();
          },
        }),
      );
    }),
  }) as const satisfies Handlers;

function extractSwapStartParam(
  params: ExchangeStartSwapParams,
  accounts: AccountLike[],
): ExchangeStartParamsUiRequest {
  if (!("fromAccountId" in params && "toAccountId" in params)) {
    throw new ExchangeError(createWrongSwapParams(params));
  }

  const realFromAccountId = getAccountIdFromWalletAccountId(params.fromAccountId);
  if (!realFromAccountId) {
    throw new ExchangeError(createAccounIdNotFound(params.fromAccountId));
  }

  const fromAccount = accounts.find(acc => acc.id === realFromAccountId);
  if (!fromAccount) {
    throw new ServerError(createAccountNotFound(params.fromAccountId));
  }

  let toAccount;

  if (params.exchangeType === "SWAP" && params.toAccountId) {
    const realToAccountId = getAccountIdFromWalletAccountId(params.toAccountId);
    if (!realToAccountId) {
      throw new ExchangeError(createAccounIdNotFound(params.toAccountId));
    }

    toAccount = accounts.find(a => a.id === realToAccountId);

    if (!toAccount) {
      throw new ServerError(createAccountNotFound(params.toAccountId));
    }
  }

  const fromParentAccount = getParentAccount(fromAccount, accounts);
  const toParentAccount = toAccount ? getParentAccount(toAccount, accounts) : undefined;

  const currency = params.tokenCurrency ? findTokenById(params.tokenCurrency) : null;
  const newTokenAccount = currency ? makeEmptyTokenAccount(toAccount, currency) : null;

  return {
    exchangeType: params.exchangeType,
    provider: params.provider,
    exchange: {
      fromAccount,
      fromParentAccount,
      toAccount: newTokenAccount ? newTokenAccount : toAccount,
      toParentAccount: newTokenAccount ? toAccount : toParentAccount,
    },
  };
}

function extractSellStartParam(
  params: ExchangeStartSellParams,
  accounts: AccountLike[],
): ExchangeStartParamsUiRequest {
  if (!("provider" in params)) {
    throw new ExchangeError(createWrongSellParams(params));
  }

  if (!params.fromAccountId) {
    return {
      exchangeType: params.exchangeType,
      provider: params.provider,
    } as ExchangeStartParamsUiRequest;
  }

  const realFromAccountId = getAccountIdFromWalletAccountId(params?.fromAccountId);

  if (!realFromAccountId) {
    throw new ExchangeError(createAccounIdNotFound(params.fromAccountId));
  }

  const fromAccount = accounts?.find(acc => acc.id === realFromAccountId);

  if (!fromAccount) {
    throw new ServerError(createAccountNotFound(params.fromAccountId));
  }

  const fromParentAccount = getParentAccount(fromAccount, accounts);

  return {
    exchangeType: params.exchangeType,
    provider: params.provider,
    exchange: {
      fromAccount,
      fromParentAccount,
    },
  };
}

async function getToCurrency(
  binaryPayload: string,
  toAccount: AccountLike,
  newTokenAccount?: TokenAccount,
): Promise<CryptoOrTokenCurrency> {
  const { payoutAddress: tokenAddress, currencyTo } = await decodeSwapPayload(binaryPayload);

  // In case of an SPL Token recipient and no TokenAccount exists.
  if (
    toAccount.type !== "TokenAccount" && // it must no be a SPL Token
    toAccount.currency.id === "solana" && // the target account must be a SOL Account
    tokenAddress !== toAccount.freshAddress
  ) {
    const splTokenCurrency = listTokensForCryptoCurrency(toAccount.currency).find(
      tk => tk.tokenType === "spl" && tk.ticker === currencyTo,
    )!;
    return splTokenCurrency;
  }

  return newTokenAccount?.token ?? getCurrencyForAccount(toAccount);
}
