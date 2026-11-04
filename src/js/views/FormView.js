import { t } from "../i18n.js";

/**
 * A form with validation and a draft. Validation is the browser's Constraint Validation API (required, min, max,
 * minlength, maxlength, pattern, type), the messages are drawn by this class so that they follow the language and are
 * tied to the field with aria-describedby / aria-invalid. A rule that HTML attributes cannot express
 * (for example "you cannot sell more than you hold") is a function that returns a message and is
 * passed to the field with setCustomValidity().
 */
export class FormView {
  /**
   * @param {HTMLFormElement} form
   * @param {object} options
   * @param {string} [options.storageKey]  localStorage key of the draft; no key, no draft
   * @param {(field: HTMLInputElement, form: FormView) => string} [options.rules]  extra rule: a message or ""
   * @param {(values: object, form: FormView) => Promise<any>} options.submit  sends the values
   * @param {(result: any, form: FormView) => void} [options.onSuccess]
   */
  constructor(form, { storageKey = null, rules = () => "", submit, onSuccess } = {}) {
    this.form = form;
    this.storageKey = storageKey;
    this.rules = rules;
    this.submit = submit;
    this.onSuccess = onSuccess;
    this.status = form.querySelector("[data-status]");
    this.touched = new Set();

    // novalidate switches off the browser's own bubbles; the check itself stays available.
    form.setAttribute("novalidate", "");
    form.addEventListener("input", (event) => this.handleInput(event));
    form.addEventListener("focusout", (event) => this.handleBlur(event));
    form.addEventListener("submit", (event) => this.handleSubmit(event));
  }

  fields() {
    return [...this.form.elements].filter((el) => el.name && !el.disabled && !["submit", "button", "reset", "fieldset", "file"].includes(el.type) && el.tagName !== "OUTPUT");
  }

  values() {
    // files are never part of a draft or of the JSON that goes to the API
    return Object.fromEntries([...new FormData(this.form).entries()].filter(([, value]) => typeof value === "string"));
  }

  // --- draft --------------------------------------------------------------------------------------------
  saveDraft() {
    if (!this.storageKey) {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.values()));
    } catch {
      // storage may be unavailable (private mode): the form still works
    }
  }

  /** Puts the saved values back into the fields; returns true when there was a draft. */
  restoreDraft() {
    if (!this.storageKey) {
      return false;
    }
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(this.storageKey) ?? "null");
    } catch {
      draft = null;
    }
    if (!draft) {
      return false;
    }
    for (const field of this.fields()) {
      if (!(field.name in draft) || field.dataset.noDraft !== undefined) {
        continue;
      }
      if (field.type === "radio") {
        field.checked = field.value === draft[field.name];
      } else if (field.type !== "checkbox") {
        field.value = draft[field.name];
      }
    }
    return true;
  }

  clearDraft() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // nothing to remove
    }
  }

  // --- validation ---------------------------------------------------------------------------------------
  messageFor(field) {
    const v = field.validity;
    if (v.customError) {
      return field.validationMessage;
    }
    if (v.valueMissing) {return t("form.err.required");}
    if (v.typeMismatch || v.badInput) {return t("form.err.type");}
    if (v.patternMismatch) {return t("form.err.pattern");}
    if (v.tooShort) {return t("form.err.tooShort", { min: field.minLength });}
    if (v.tooLong) {return t("form.err.tooLong", { max: field.maxLength });}
    if (v.rangeUnderflow) {return t("form.err.min", { min: field.min });}
    if (v.rangeOverflow) {return t("form.err.max", { max: field.max });}
    return t("form.err.invalid");
  }

  showError(field, message) {
    field.setAttribute("aria-invalid", message ? "true" : "false");
    const box = this.form.querySelector(`[data-error-for="${field.name}"]`);
    if (box) {
      box.textContent = message;
    }
  }

  validateField(field) {
    field.setCustomValidity("");
    const custom = field.validity.valid ? this.rules(field, this) : "";
    if (custom) {
      field.setCustomValidity(custom);
    }
    const valid = field.checkValidity();
    this.showError(field, valid ? "" : this.messageFor(field));
    return valid;
  }

  /** Checks every field, shows all the messages and moves the focus to the first wrong one. */
  validate() {
    let first = null;
    for (const field of this.fields()) {
      if (!this.validateField(field) && !first) {
        first = field;
      }
    }
    first?.focus();
    return !first;
  }

  clearErrors() {
    this.touched.clear();
    this.fields().forEach((field) => {
      field.setCustomValidity("");
      this.showError(field, "");
    });
    this.setStatus("");
  }

  setStatus(message, tone = "info") {
    if (!this.status) {
      return;
    }
    this.status.textContent = message;
    this.status.dataset.tone = message ? tone : "";
  }

  // --- events ---------------------------------------------------------------------------------------------
  handleInput(event) {
    const field = event.target;
    this.saveDraft();
    // a field that is already marked is checked again while typing, so the message goes away as soon as it is fixed
    if (this.touched.has(field.name) && field.name) {
      this.validateField(field);
    }
  }

  handleBlur(event) {
    const field = event.target;
    if (field.name && this.fields().includes(field) && field.type !== "radio" && (field.value !== "" || this.touched.has(field.name))) {
      this.touched.add(field.name);
      this.validateField(field);
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.fields().forEach((field) => this.touched.add(field.name));
    if (!this.validate()) {
      this.setStatus(t("form.fixErrors"), "error");
      return;
    }
    const button = this.form.querySelector('[type="submit"]');
    button.disabled = true;
    this.form.setAttribute("aria-busy", "true");
    this.setStatus(t("state.loading"));
    try {
      const result = await this.submit(this.values(), this);
      this.clearDraft();
      this.setStatus("");
      this.onSuccess?.(result, this);
    } catch (error) {
      // the server validates too: its messages go under the fields they belong to
      const names = Object.keys(error.fields ?? {});
      for (const name of names) {
        const field = this.form.elements[name];
        // a radio group comes as a list of inputs; the message is shown for the first one
        if (field?.setAttribute) {
          this.showError(field, error.fields[name]);
        }
      }
      this.form.elements[names[0]]?.focus();
      this.setStatus(error.message || t("form.saveFailed"), "error");
    } finally {
      button.disabled = false;
      this.form.removeAttribute("aria-busy");
    }
  }
}
