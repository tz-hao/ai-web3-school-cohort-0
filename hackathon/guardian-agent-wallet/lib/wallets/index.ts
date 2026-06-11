import { appConfig } from "@/lib/wallets/cawConfig";
import { cawWalletAdapter } from "./cawWallet";
import { mockWalletAdapter } from "./mockWallet";
import type { WalletAdapter } from "./walletAdapter";

export function getWalletAdapter(): WalletAdapter {
  if (appConfig.walletMode === "caw") {
    return cawWalletAdapter;
  }

  return mockWalletAdapter;
}

export { cawWalletAdapter, mockWalletAdapter };
export type { WalletAdapter };
