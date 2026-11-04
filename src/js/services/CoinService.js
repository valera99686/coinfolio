import { ItemService } from "./ItemService.js";
import { nextPosition } from "../utils/portfolio.js";

/** Chips of the Assets page -> json-server operators (the server filters, the client gets a ready page). */
export const FILTERS = {
  all: {},
  holdings: { amount_gte: 0.000001 },
  gainers: { change24h_gte: 0.01 },
  losers: { change24h_lte: -0.01 },
  watchlist: { watched: true },
};

/** The natural order of every sort field: names A to Z, numbers from the biggest. */
export const DEFAULT_ORDER = { marketCap: "desc", price: "desc", change24h: "desc", name: "asc" };

export const CATEGORIES = ["Layer 1", "Layer 2", "Stablecoin", "Payments", "DeFi", "Infrastructure", "Gaming", "Meme"];

export class CoinService extends ItemService {
  constructor(options = {}) {
    super({ resource: "coins", ...options });
  }

  /** One page of the Assets list: search, filter, category, sort and page all go to the API. */
  list({ q = "", filter = "all", category = "", sort = "marketCap", order = "desc", page = 1, limit = 10 } = {}, options) {
    const params = { _page: page, _limit: limit, _sort: sort, _order: order, ...FILTERS[filter] };
    if (q) {
      params.q = q;
    }
    if (category) {
      params.category = category;
    }
    return this.getList(params, options);
  }

  /** Coins that are in the portfolio, the biggest position first. */
  holdings(options) {
    return this.getList({ ...FILTERS.holdings, _sort: "value", _order: "desc", _limit: 100 }, options);
  }

  watchlist(options) {
    return this.getList({ watched: true, _sort: "marketCap", _order: "desc", _limit: 100 }, options);
  }

  setWatched(id, watched) {
    return this.patch(id, { watched });
  }

  /** Writes the new position of a coin after a transaction. */
  applyTransaction(coin, transaction) {
    return this.patch(coin.id, nextPosition(coin, transaction));
  }
}
