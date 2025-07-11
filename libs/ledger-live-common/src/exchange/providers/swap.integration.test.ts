import { fetchAndMergeProviderData } from "./swap";

describe("fetchAndMergeProviderData", () => {
  it("returns all data in expected format", async () => {
    // When
    const providers = await fetchAndMergeProviderData({
      ledgerSignatureEnv: "prod",
      partnerSignatureEnv: "prod",
    });

    // Then
    expect(providers).toEqual({
      changelly: {
        displayName: "Changelly",
        useInExchangeApp: true,
        mainUrl: "https://changelly.com/",
        name: "Changelly",
        needsKYC: false,
        usefulUrls: [
          "https://changelly.com/terms-of-use",
          "https://changelly.com/aml-kyc",
          "https://support.changelly.com/en/support/tickets/new",
        ],
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "0480d7c0d3a9183597395f58dda05999328da6f18fabd5cda0aff8e8e3fc633436a2dbf48ecb23d40df7c3c7d3e774b77b4b5df0e9f7e08cf1cdf2dba788eb085b",
            "hex",
          ),
        },
        signature: Buffer.from(
          "3045022100e73339e5071b5d232e8cacecbd7c118c919122a43f8abb8b2062d4bfcd58274e022050b11605d8b7e199f791266146227c43fd11d7645b1d881f705a2f8841d21de5",
          "hex",
        ),
        supportUrl: "https://support.changelly.com/en/support/home",
        termsOfUseUrl: "https://changelly.com/terms-of-use",
        type: "CEX",
        version: 1,
      },
      changelly_v2: {
        displayName: "Changelly",
        name: "Changelly",
        useInExchangeApp: true,
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "0480d7c0d3a9183597395f58dda05999328da6f18fabd5cda0aff8e8e3fc633436a2dbf48ecb23d40df7c3c7d3e774b77b4b5df0e9f7e08cf1cdf2dba788eb085b",
            "hex",
          ),
        },
        signature: Buffer.from(
          "3045022100c2db00da651cfcc84702f75ab5f131a3f037592080ea750a6f665a8cb36797c802200e594938cdf2c836b34717f57487002a0588f2088f64f00a6c4d320fd37db6fa",
          "hex",
        ),
        needsKYC: false,
        type: "CEX",
        usefulUrls: [
          "https://changelly.com/terms-of-use",
          "https://changelly.com/aml-kyc",
          "https://support.changelly.com/en/support/tickets/new",
        ],
        termsOfUseUrl: "https://changelly.com/terms-of-use",
        supportUrl: "https://support.changelly.com/en/support/home",
        mainUrl: "https://changelly.com/",
        version: 2,
      },
      changenow: {
        name: "ChangeNOW",
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "04f5cbcda3cf0fdb2f150de0bed95b5c0f9ef1db1c8ca5b615d33093f9c8e290eeb7985c2ca2ef765bcf63bf9ade5a5d432d6e7d959e748053b6228e4faf439fc2",
            "hex",
          ),
        },
        signature: Buffer.from(
          "3045022100a321d8023cfe4262ef46dfc581350588cfc737d4052fbeb239c7bf92cf8263140220644871cad6c1dbadf853ecafb7d2b80d6c24cd2c473f1e51ebd3bdbe86d4afde",
          "hex",
        ),
        version: 1,
      },
      cic: {
        displayName: "CIC",
        mainUrl: "https://criptointercambio.com/",
        useInExchangeApp: true,
        name: "CIC",
        needsKYC: false,
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "0444a71652995d15ef0d4d6fe8de21a0c8ad48bdbfea7f789319973669785ca96abca9fd0c504c3074d9b654f0e3a76dde642a03efe4ccdee3af3ca4ba4afa202d",
            "hex",
          ),
        },
        signature: Buffer.from(
          "3044022078a73433ab6289027b7a169a260f180d16346f7ab55b06a22109f68a756d691d0220190edd6e1214c3309dc1b0afe90d217b728377491561383f2ee543e2c90188eb",
          "hex",
        ),
        supportUrl: "https://criptointercambio.com/en/about",
        termsOfUseUrl: "https://criptointercambio.com/terms-of-use",
        type: "CEX",
        version: 1,
      },
      exodus: {
        displayName: "Exodus",
        useInExchangeApp: true,
        mainUrl: "https://www.exodus.com/",
        name: "Exodus",
        needsKYC: false,
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "048abacf1b1027b7c5f96d77826eada263e21d2ba8a2a037a84e0679e05d997a91ff34df181f88bdaf3521c26fb70eb028622f3afd66d0c282d5bb61da38ad76c1",
            "hex",
          ),
        },
        signature: Buffer.from(
          "304402206803fd43c5e0af3bf6e4b6a049c3a10f4d44f4b7b6e2bb4cb2cfd3958cfc3192022063ad397ad75769396bdb776bc4e7a8ca9af09c7b583fa9f0b7690bb7d1cbed50",
          "hex",
        ),
        supportUrl: "mailto:support@xopay.com",
        termsOfUseUrl: "https://www.exodus.com/terms/",
        type: "CEX",
        version: 2,
      },
      ftx: {
        name: "FTX",
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "04c89f3e48cde252f6cd6fcccc47c2f6ca6cf05f9f921703d31b7a7dddbf0bd6a690744662fe599f8761612021ba1fc0e8a5a4b7d5910c625b6dd09aa40762e5cd",
            "hex",
          ),
        },
        signature: Buffer.from(
          "3044022029c0fb80d6e524f811f30cc04a349fa7f8896ce1ba84010da55f7be5eb9d528802202727985361cab969ad9b4f56570f3f6120c1d77d04ba10e5d99366d8eecee8e2",
          "hex",
        ),
        version: 1,
      },
      lifi: {
        type: "CEX",
        displayName: "LI.FI",
        name: "LI.FI",
        useInExchangeApp: true,
        termsOfUseUrl: "https://li.fi/legal/terms-and-conditions/",
        supportUrl: "https://discord.gg/jumperexchange",
        mainUrl: "https://li.fi/",
        needsKYC: false,
        version: 2,
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "04e5f4fa0f28dec3b1f52934f29bd91ab862b003a531d67ba3864e3ba4303be8e815a619ee6f78e8079acf46f0d0d8fc664be2f343d1c9a20c4d2420f51a56ccea",
            "hex",
          ),
        },
        signature: Buffer.from(
          "3044022041344dba7353fe94a4d24a20285b5afaa8fa9a022a62e1042d059b0f1d37cbc302200a3ed5d661df0c44d78c439939c4c49868936c7357da3807a19104bcfb323d24",
          "hex",
        ),
      },
      moonpay: {
        displayName: "MoonPay",
        useInExchangeApp: true,
        mainUrl: "https://www.moonpay.com/",
        name: "MoonPay",
        needsKYC: true,
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "044989cad389020fadfb9d7a85d29338a450beec571347d2989fb57b99ecddbc8907cf8c229deee30fb8ac139e978cab8f6efad76bde2a9c6d6710ceda1fe0a4d8",
            "hex",
          ),
        },
        signature: Buffer.from(
          "3045022100a63e1ca73525e2e05fc9e95b906793f252fef7df14f1cd830640a1266f8e11e202205714c92b6829108dd7cc60f4e13917cdc7b4bc5048d83d4db65b19c61e7b8a41",
          "hex",
        ),
        supportUrl: "https://support.moonpay.com/",
        termsOfUseUrl: "https://www.moonpay.com/legal/terms_of_use_row",
        type: "CEX",
        version: 2,
      },
      oneinch: {
        displayName: "1inch",
        useInExchangeApp: false,
        mainUrl: "https://1inch.io/",
        needsKYC: false,
        supportUrl: "https://help.1inch.io/en/",
        termsOfUseUrl: "https://1inch.io/assets/1inch_network_terms_of_use.pdf",
        type: "DEX",
      },
      paraswap: {
        displayName: "Paraswap",
        mainUrl: "https://www.paraswap.io/",
        useInExchangeApp: false,
        needsKYC: false,
        supportUrl: "https://help.paraswap.io/en/",
        termsOfUseUrl: "https://files.paraswap.io/tos_v4.pdf",
        type: "DEX",
      },
      thorswap: {
        displayName: "THORChain",
        mainUrl: "https://www.thorswap.finance/",
        name: "THORSwap",
        useInExchangeApp: true,
        needsKYC: false,
        publicKey: {
          curve: "secp256r1",
          data: Buffer.from(
            "0480a453a91e728c5f622d966b90d15de6fdb6c267bb8147dd0e0d4e1c730d631594e724aaf2b2f526600f3713ce6bc2adbfdbaafd2121bfee64fce93fd59a9050",
            "hex",
          ),
        },
        signature: Buffer.from(
          "304402207a9676f6971575cad70e4ef4d937ebdba82c51e6a0ab5343c11fefa18dff326d0220643f0718da68ead3fd9900eb90bca782d533d1698c8ea1435ae232ddf2e94229",
          "hex",
        ),
        supportUrl: "https://ledgerhelp.swapkit.dev/",
        termsOfUseUrl: "https://docs.thorswap.finance/thorswap/resources/terms-of-service",
        type: "DEX",
        version: 2,
      },
      uniswap: {
        displayName: "Uniswap",
        useInExchangeApp: false,
        mainUrl: "https://uniswap.org/",
        needsKYC: false,
        supportUrl: "https://support.uniswap.org/hc/en-us/requests/new",
        termsOfUseUrl:
          "https://support.uniswap.org/hc/en-us/articles/30935100859661-Uniswap-Labs-Terms-of-Service",
        type: "DEX",
      },
      wyre: {
        name: "Wyre",
        publicKey: {
          curve: "secp256k1",
          data: Buffer.from(
            "04ad01a6241929a5ec331046868fbacb424696fd7c8a4d824fee61268374e9f4f87ffc5301f0e0a84cea69ffed46e14c771f9ca1eea345f6531994291c816e8ae6",
            "hex",
          ),
        },
        signature: Buffer.from(
          "304402207b49e46d458a55daee9bc8ed96e1b404c2d99dbbc3d3c3c15430026eb7e01a05022011ab86db08a4c956874a83f23d918319a073fdd9df23a1c7eed8a0a22c98b1e3",
          "hex",
        ),
        version: 1,
      },
    });
  });
});
