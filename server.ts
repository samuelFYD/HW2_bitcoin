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

      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      };

      const [btcRes, mstrRes] = await Promise.all([
        fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", { headers }).then(r => r.json()).catch(() => null),
        fetch("https://query1.finance.yahoo.com/v8/finance/chart/MSTR", { headers }).then(r => r.json()).catch(() => null)
      ]);

      if (btcRes?.price) {
        btcPrice = parseFloat(btcRes.price);
      } else {
        // Fallback for BTC price if Binance fails
        try {
          const coindeskRes = await fetch("https://api.coindesk.com/v1/bpi/currentprice.json", { headers }).then(r => r.json());
          if (coindeskRes?.bpi?.USD?.rate_float) {
            btcPrice = coindeskRes.bpi.USD.rate_float;
          }
        } catch (e) {
          console.error("CoinDesk fallback failed:", e);
        }
      }

      if (mstrRes?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        mstrPrice = mstrRes.chart.result[0].meta.regularMarketPrice;
      } else {
        // Fallback for MSTR price if query1 fails
        try {
          const mstrRes2 = await fetch("https://query2.finance.yahoo.com/v8/finance/chart/MSTR", { headers }).then(r => r.json());
          if (mstrRes2?.chart?.result?.[0]?.meta?.regularMarketPrice) {
            mstrPrice = mstrRes2.chart.result[0].meta.regularMarketPrice;
          }
        } catch (e) {
          console.error("Yahoo query2 fallback failed:", e);
        }
      }

      // Fetch Historical Data (MSTR and BTC)
      const yRange = range <= 7 ? "5d" : range <= 30 ? "1mo" : "3mo";
      const [mstrHistRes, btcHistRes] = await Promise.all([
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/MSTR?range=${yRange}&interval=1d`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=${yRange}&interval=1d`, { headers }).then(r => r.json()).catch(() => null)
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
