export function parseTradeRow(row) {
  return {
    date:       row['日期'],
    type:       row['類型'],
    fundSource: row['資金來源'],
    symbol:     row['股票代號'],
    name:       row['股票名稱'],
    shares:     Number(row['股數']) * 1000,
    price:      Number(row['價格']) || null,
    amount:     Number(row['金額']),
    fee:        Number(row['手續費']),
  }
}

export function parseApiTrade(row, index) {
  return {
    id:         index + 1,
    date:       row['日期'],
    type:       row['類型'],
    fundSource: row['資金來源'],
    symbol:     row['股票代號'],
    name:       row['股票名稱'],
    shares:     Number(row['股數']),
    price:      Number(row['價格']),
    amount:     Number(row['金額']),
    fee:        Number(row['手續費']),
  }
}
