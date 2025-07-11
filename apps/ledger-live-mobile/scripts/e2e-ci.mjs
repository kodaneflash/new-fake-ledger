#!/usr/bin/env zx
import { basename } from "path";

let platform, test, build, bundle;
let testType = "mock";
let cache = true;
let shard = "";
let target = "release";
let filter = "";

$.verbose = true; // everything works like in v7

if (os.platform() === "win32") {
  usePowerShell();
}

const usage = (exitCode = 1) => {
  console.log(
    `Usage: ${basename(
      __filename,
    )} -p --platform <ios|android> [-h --help]  [-t --test] [-b --build] [--bundle] [--cache | --no-cache] [--testType] [--shard] [--production]`,
  );
  process.exit(exitCode);
};

const build_ios = async () => {
  await $`pnpm mobile exec detox clean-framework-cache`;
  await $`pnpm mobile exec detox build-framework-cache`;
  await $`pnpm mobile e2e:build -c ios.sim.${target}`;
};

const bundle_ios = async () => {
  await $`pnpm mobile bundle:ios --dev false --minify false`;
};

const bundle_ios_with_cache = async () => {
  await bundle_ios();

  await $`pnpm mobile exec detox clean-framework-cache`;
  await $`pnpm mobile exec detox build-framework-cache`;
  within(async () => {
    cd("apps/ledger-live-mobile");
    await $`cp main.jsbundle ios/build/Build/Products/Release-iphonesimulator/ledgerlivemobile.app/main.jsbundle`;
    await $`mv main.jsbundle ios/build/Build/Products/Release-iphonesimulator/main.jsbundle`;
  });
};

const test_ios = async () => {
  await $`pnpm mobile ${testType}:test\
    -c ios.sim.${target} \
    --loglevel error \
    --record-logs failing \
    --record-videos failing \
    --take-screenshots failing \
    --forceExit \
    --headless \
    --retries 2 \
    --runInBand \
    --cleanup \
    --shard ${shard} \
    ${filter.split(" ")}`;
};

const build_android = async () => {
  await $`pnpm mobile e2e:build -c android.emu.${target}`;
};

const test_android = async () => {
  await $`pnpm mobile ${testType}:test \\
    -c android.emu.${target} \\
    --loglevel error \\
    --record-logs failing \\
    --take-screenshots failing \\
    --forceExit \\
    --headless \\
    --retries 1 \\
    --runInBand \\
    --cleanup \\
    --shard ${shard} \\
    ${filter.split(" ")}`;
};

const getTasksFrom = {
  ios: {
    build: build_ios,
    bundle: async () => (cache ? await bundle_ios_with_cache() : await bundle_ios()),
    test: test_ios,
  },
  android: {
    build: build_android,
    bundle: () => undefined,
    test: test_android,
  },
};

for (const argName in argv) {
  switch (argName) {
    case "help":
    case "h":
      usage(0);
      break;
    case "platform":
    case "p":
      if (argv[argName] !== "ios" && argv[argName] !== "android") {
        usage(1);
      } else {
        platform = argv[argName];
      }
      break;
    case "test":
    case "t":
      test = true;
      break;
    case "build":
    case "b":
      build = true;
      break;
    case "bundle":
      bundle = true;
      break;
    case "cache":
      cache = argv[argName];
      break;
    case "_":
      break;
    case "e2e":
      testType = "e2e";
      break;
    case "shard":
      shard = argv[argName];
      break;
    case "production":
      target = "prerelease";
      break;
    case "filter":
      filter = argv[argName];
      break;
    default:
      usage(42);
      break;
  }
}

within(async () => {
  if (!platform) {
    usage(2);
  }

  cd("../../");
  if (build) {
    await getTasksFrom[platform].build();
  }
  if (bundle) {
    await getTasksFrom[platform].bundle();
  }
  if (test) {
    await getTasksFrom[platform].test();
  }
});
