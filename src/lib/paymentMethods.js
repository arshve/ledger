const KEY = 'payment_methods'
const DEFAULTS = ['BCA •• 4827', 'GoPay', 'OVO', 'ShopeePay', 'Dana', 'Cash', 'QRIS']

export function getPaymentMethods() {
  try {
    const s = localStorage.getItem(KEY)
    return s ? JSON.parse(s) : DEFAULTS
  } catch { return DEFAULTS }
}

export function savePaymentMethods(methods) {
  localStorage.setItem(KEY, JSON.stringify(methods))
}
