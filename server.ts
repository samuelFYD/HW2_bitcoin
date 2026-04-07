import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to fetch latest financial data
  app.get("/api/data", async (req, res) => {
    try {
      const range = req.query.range ? parseInt(req.query.range as string) : 30;
      
      // Fetch current prices
      let btcPrice = 95000;
      let mstrPrice = 180.5;

      const [btcRes, mstrRes] = await Promise.all([
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").then(r => r.json()),
        fetch("https://query1.finance.yahoo.com/v8/finance/chart/MSTR").then(r => r.json())
      ]);

      if (btcRes?.price) btcPrice = parseFloat(btcRes.price);
      if (mstrRes?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        mstrPrice = mstrRes.chart.result[0].meta.regularMarketPrice;
      }

      // Fetch Historical Data (MSTR and BTC)
      const yRange = range <= 7 ? "5d" : range <= 30 ? "1mo" : "3mo";
      const [mstrHistRes, btcHistRes] = await Promise.all([
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/MSTR?range=${yRange}&interval=1d`).then(r => r.json()),
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=${yRange}&interval=1d`).then(r => r.json())
      ]);
      
      const mstrResult = mstrHistRes?.chart?.result?.[0];
      const btcResult = btcHistRes?.chart?.result?.[0];
      
      const mstrTimestamps = mstrResult?.timestamp || [];
      const mstrPrices = mstrResult?.indicators?.quote?.[0]?.close || [];
      
      const btcTimestamps = btcResult?.timestamp || [];
      const btcPrices = btcResult?.indicators?.quote?.[0]?.close || [];

      // Create a map for BTC prices by date for easy lookup
      const btcPriceMap: Record<string, number> = {};
      btcTimestamps.forEach((t: number, i: number) => {
        const date = new Date(t * 1000).toISOString().split('T')[0];
        if (btcPrices[i]) btcPriceMap[date] = btcPrices[i];
      });
      
      const historicalPrices = mstrTimestamps.map((t: number, i: number) => {
        const date = new Date(t * 1000).toISOString().split('T')[0];
        return {
          date,
          mstrPrice: mstrPrices[i] || mstrPrice,
          btcPrice: btcPriceMap[date] || btcPrice
        };
      }).filter((p: any) => p.mstrPrice !== null);

      // Latest MSTR Holdings (Static for now as it changes quarterly)
      const mstrHoldings = 766970;
      const sharesOutstanding = 379425000;

      res.json({
        btcPrice,
        mstrPrice,
        mstrHoldings,
        sharesOutstanding,
        historicalPrices,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not running as a serverless function (Vercel)
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

export default startServer();
