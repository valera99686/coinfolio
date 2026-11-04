// One shared instance of every service. Pages import what they need from here.
import { ItemService, SingletonService } from "./ItemService.js";
import { CoinService } from "./CoinService.js";
import { TransactionService } from "./TransactionService.js";

export const coinService = new CoinService();
export const transactionService = new TransactionService();
export const detailsService = new ItemService({ resource: "details" });
export const chartService = new ItemService({ resource: "charts" });
export const walletService = new ItemService({ resource: "wallets" });
export const profileService = new SingletonService({ resource: "profile" });
export const marketService = new SingletonService({ resource: "market" });
export const portfolioService = new SingletonService({ resource: "portfolio" });
