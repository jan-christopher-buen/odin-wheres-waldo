import '@testing-library/jest-dom/vitest'
// jsdom does not implement the browser's native dialog methods.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
}
