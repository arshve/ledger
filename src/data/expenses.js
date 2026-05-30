export const CATS = {
  food:         { icon: 'food',    label: 'Food & dining'  },
  shopping:     { icon: 'cart',    label: 'Shopping'       },
  coffee:       { icon: 'coffee',  label: 'Coffee'         },
  transport:    { icon: 'car',     label: 'Transport'      },
  subscription: { icon: 'tv',      label: 'Subscriptions'  },
  utility:      { icon: 'home',    label: 'Utilities'      },
  travel:       { icon: 'plane',   label: 'Travel'         },
  groceries:    { icon: 'cart',    label: 'Groceries'      },
  sport:        { icon: 'pin',     label: 'Sports'         },
  general:      { icon: 'receipt', label: 'Other'          },
}

export const formatIDR = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n)

export const formatIDRShort = n => {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'k'
  return 'Rp ' + n
}
