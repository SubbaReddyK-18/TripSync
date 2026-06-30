export function formatINR(amountInPaise) {
  if (amountInPaise == null || isNaN(amountInPaise)) return '₹0'
  return `₹${(amountInPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatINRWithDecimals(amountInPaise) {
  if (amountInPaise == null || isNaN(amountInPaise)) return '₹0.00'
  return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
