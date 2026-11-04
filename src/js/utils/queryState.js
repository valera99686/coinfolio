/**
 * State of a page (search, filter, sort, page number) kept in the URL: the link can be sent to somebody,
 * a reload shows the same list and the Back button returns to the previous state.
 *
 *   const state = createQueryState({ q: "", filter: "all", page: 1 }, { numeric: ["page"] });
 *   state.read();                    // from location.search, unknown or broken values fall back to defaults
 *   state.write({ ...next }, {});    // pushState (replace: true -> replaceState)
 */
export function createQueryState(defaults, { numeric = [], allowed = {} } = {}) {
  const sanitize = (key, value) => {
    if (numeric.includes(key)) {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : defaults[key];
    }
    if (allowed[key] && !allowed[key].includes(value)) {
      return defaults[key];
    }
    return String(value);
  };

  return {
    defaults,

    read(search = window.location.search) {
      const params = new URLSearchParams(search);
      const state = { ...defaults };
      for (const key of Object.keys(defaults)) {
        if (params.has(key)) {
          state[key] = sanitize(key, params.get(key));
        }
      }
      return state;
    },

    /** Query string with only the values that differ from the defaults. */
    toSearch(state) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(state)) {
        if (key in defaults && value !== "" && value !== defaults[key]) {
          params.set(key, value);
        }
      }
      const text = params.toString();
      return text ? `?${text}` : "";
    },

    href(state) {
      return `${window.location.pathname}${this.toSearch(state)}${window.location.hash}`;
    },

    write(state, { replace = false } = {}) {
      const url = this.href(state);
      if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        return;
      }
      window.history[replace ? "replaceState" : "pushState"](state, "", url);
    },
  };
}
