import axios from "axios";
import { API_URL, REQUEST_TIMEOUT } from "../config.js";

/** An error the views can show: a readable message plus the details of the failed request. */
export class ApiError extends Error {
  constructor(message, { status = 0, fields = {}, canceled = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.canceled = canceled;
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The only place that knows about the network: base URL, timeout, error normalisation and the retry of
 * GET requests. Views and services never call axios directly.
 */
export class HttpClient {
  constructor(baseURL, { timeout = 8000, retries = 2, retryDelay = 800 } = {}) {
    this.retries = retries;
    this.retryDelay = retryDelay;
    this.onRetry = null; // (attempt, error) => void, lets the UI say "waking up the API"
    this.instance = axios.create({ baseURL, timeout });
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(HttpClient.normalize(error)),
    );
  }

  static normalize(error) {
    if (axios.isCancel(error)) {
      return new ApiError("Request canceled", { canceled: true });
    }
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error || `Request failed with status ${status}`;
      return new ApiError(message, { status, fields: data?.fields ?? {} });
    }
    if (error.code === "ECONNABORTED") {
      return new ApiError("The server took too long to respond. It may be waking up, please try again.");
    }
    return new ApiError("Network error. Is the API running?");
  }

  async get(url, config) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.instance.get(url, config);
      } catch (error) {
        // Only a missing answer is worth another try; a 4xx / 5xx answer or a cancel is final.
        const lost = !error.canceled && error.status === 0;
        if (!lost || attempt >= this.retries) {
          throw error;
        }
        this.onRetry?.(attempt + 1, error);
        await wait(this.retryDelay * (attempt + 1));
      }
    }
  }

  post(url, data, config) {
    return this.instance.post(url, data, config);
  }

  patch(url, data, config) {
    return this.instance.patch(url, data, config);
  }
}

export const http = new HttpClient(API_URL, { timeout: REQUEST_TIMEOUT });
