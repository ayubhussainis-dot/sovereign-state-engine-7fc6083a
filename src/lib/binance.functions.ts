  };
}

// --- REQUIRED EXPORTS TO SATISFY INDEX.TSX IMPORTS ---

export async function getFuturesTelemetry(symbol = "BTCUSDT") {
  return await fetchFuturesTelemetry(symbol);
}

export async function executeDirectOrder(side: "BUY" | "SELL", quantity: number, symbol = "BTCUSDT") {
  const apiKey = process.env["BINANCE_TESTNET_API_KEY"];
  const apiSecret = process.env["BINANCE_TESTNET_API_SECRET"];
  if (!apiKey || !apiSecret) {
    throw new Error("Binance credentials not configured for direct order");
  }

  const ts = Date.now();
  const query = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${ts}&recvWindow=5000`;
  const signature = sign(query, apiSecret);

  const res = await fetch(`${FAPI_BASE}/fapi/v1/order?${query}&signature=${signature}`, {
    method: "POST",
    headers: { "X-MBX-APIKEY": apiKey },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Order failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

export async function getActivePosition(symbol = "BTCUSDT") {
  const apiKey = process.env["BINANCE_TESTNET_API_KEY"];
  const apiSecret = process.env["BINANCE_TESTNET_API_SECRET"];
  if (!apiKey || !apiSecret) {
    return { hasPosition: false, positionAmt: 0, entryPrice: 0, unRealizedProfit: 0, leverage: 1 };
  }

  const ts = Date.now();
  const query = `timestamp=${ts}&recvWindow=5000`;
  const signature = sign(query, apiSecret);

  const res = await fetch(`${FAPI_BASE}/fapi/v2/positionRisk?${query}&signature=${signature}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });

  if (!res.ok) {
    return { hasPosition: false, positionAmt: 0, entryPrice: 0, unRealizedProfit: 0, leverage: 1 };
  }

  const positions = (await res.json()) as Array<{
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    unRealizedProfit: string;
    leverage: string;
  }>;

  const target = positions.find((p) => p.symbol === symbol) || positions[0];
  if (!target) {
    return { hasPosition: false, positionAmt: 0, entryPrice: 0, unRealizedProfit: 0, leverage: 1 };
  }

  const amt = Number(target.positionAmt);
  return {
    hasPosition: amt !== 0,
    positionAmt: amt,
    entryPrice: Number(target.entryPrice),
    unRealizedProfit: Number(target.unRealizedProfit),
    leverage: Number(target.leverage || 1),
  };
}
