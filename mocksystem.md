How the Mock System Works
The mock system in Ledger Live Mobile is an end-to-end (E2E) testing framework built around Detox and a custom websocket bridge. Its primary purpose is to allow developers to run automated UI tests in a predictable and controlled environment, simulating the entire user experience without requiring a real hardware device or live network conditions.
Here are the core components based on the documentation 1:
Test Runner (Detox): This is the orchestrator. It runs on your development machine, launches the Ledger Live Mobile app on a simulator, and executes test scripts written in JavaScript (/e2e/specs).
Websocket Bridge (/e2e/bridge): This is the critical communication channel. When the app is launched in a test environment, it opens a websocket connection back to the test runner. This bridge allows the test script to send commands directly into the running app.

ock Data Setups (/e2e/setups): This directory contains JSON files that represent a complete snapshot of the application's state. This includes a user's settings, their full list of accounts, balances, and transaction history. Before a test run, the test runner can use the websocket bridge to command the app to load one of these setup files, instantly populating the Redux store with a specific, known dataset.
Mock Device Events (mockDeviceEvent): For interactive flows that require a hardware device (like sending funds or checking an address), the test runner can send mock device events over the websocket. For example, it can send { type: "device-permission-granted" } to simulate a user pressing "Approve" on their Ledger device, or { type: "error", error: { name: "UserRefusedOnDevice" } } to simulate a rejection 2.


Data Flow: Wallet Screen in Mock Mode
Here is how the mock system precisely interacts with the Wallet Screen data flow, altering the origin of the data:

Data Injection (Bypassing Normal Sync):
Normally, the app syncs with the blockchain to get balances and transactions. In mock mode, this is bypassed.
The Detox test runner reads a specific JSON file from /e2e/setups and sends its entire content through the websocket bridge to the app.
The app receives this massive JSON object and uses it to overwrite the initial state of the Redux store. The accounts, settings, and countervalues reducers are force-fed this static, predictable data.
UI Renders from Mocked State:
From this point forward, the process is identical to the normal data flow. The UI components are "dumb" in this regard; they don't know the source of the data.
The Portfolio screen and its children components (PortfolioGraphCard, PortfolioAssets) use the exact same selectors and hooks to read from the Redux store.
The UI renders perfectly, showing the total balance, the graph, and the list of accounts exactly as defined in the mock setup file. The $0.00 in the screenshot is simply the value that was set in the mock data.