import { ItemService } from "./ItemService.js";

export class TransactionService extends ItemService {
  constructor(options = {}) {
    // a new transaction changes the position of a coin, so the cached coins are stale as well
    super({ resource: "transactions", related: ["/coins"], ...options });
  }

  /** Newest first. `type` is "buy", "sell" or "" for all kinds. */
  list({ coinId = "", type = "", page = 1, limit = 20 } = {}, options) {
    const params = { _sort: "date", _order: "desc", _page: page, _limit: limit };
    if (coinId) {
      params.coinId = coinId;
    }
    if (type) {
      params.type = type;
    }
    return this.getList(params, options);
  }

  /** The latest transactions of the whole portfolio together with the coin they belong to. */
  recent(limit = 5, options) {
    return this.getList({ _sort: "date", _order: "desc", _limit: limit, _expand: "coin" }, options);
  }

  /** Number of transactions, read from X-Total-Count of a one-record page. */
  async count(options) {
    const { total } = await this.getList({ _limit: 1 }, options);
    return total;
  }
}
