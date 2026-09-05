import { useState } from "react"
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, Coins, BarChart3 } from "lucide-react"
import GoldForecastCard from "./GoldForecastCard"

// ---- Custom UI Components (replacing shadcn/ui) ----
const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}>{children}</div>
)

const CardHeader = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
)

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const Badge = ({ children, variant = "default", className = "" }) => {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors"
  const variants = {
    default: "bg-green-100 text-green-800",
    destructive: "bg-red-100 text-red-800",
  }
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>
}

// ---- Safe number formatting ----
const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0"
  return Number(num).toLocaleString()
}

// ---- Mock market data ----
const mockMarketData = {
  indices: [
    { name: "NIFTY 50", value: 19674.25, change: 156.35, changePercent: 0.8 },
    { name: "SENSEX", value: 65953.48, change: 528.17, changePercent: 0.81 },
    { name: "NIFTY BANK", value: 44821.3, change: -89.45, changePercent: -0.2 },
    { name: "NIFTY IT", value: 31245.6, change: 245.8, changePercent: 0.79 },
  ],
  topStocks: [
    { symbol: "RELIANCE", price: 2456.75, change: 23.45, changePercent: 0.96 },
    { symbol: "TCS", price: 3678.9, change: -12.3, changePercent: -0.33 },
    { symbol: "HDFC BANK", price: 1589.25, change: 18.75, changePercent: 1.19 },
    { symbol: "INFOSYS", price: 1456.8, change: 34.2, changePercent: 2.4 },
    { symbol: "ICICI BANK", price: 945.6, change: -5.4, changePercent: -0.57 },
    { symbol: "BHARTI AIRTEL", price: 876.45, change: 12.85, changePercent: 1.49 },
    { symbol: "ITC", price: 456.3, change: -2.15, changePercent: -0.47 },
    { symbol: "WIPRO", price: 423.75, change: 8.9, changePercent: 2.14 },
    { symbol: "MARUTI SUZUKI", price: 9876.5, change: 145.3, changePercent: 1.49 },
    { symbol: "ASIAN PAINTS", price: 3245.8, change: -45.6, changePercent: -1.39 },
  ],
  commodities: [
    { name: "Gold", price: 62450, unit: "per 10g", change: 125, changePercent: 0.2 },
    { name: "Silver", price: 74680, unit: "per kg", change: -340, changePercent: -0.45 },
    { name: "Crude Oil", price: 6789, unit: "per barrel", change: 45, changePercent: 0.67 },
  ],
  currencies: [
    { pair: "USD/INR", rate: 83.25, change: 0.15, changePercent: 0.18 },
    { pair: "EUR/INR", rate: 90.45, change: -0.25, changePercent: -0.28 },
    { pair: "GBP/INR", rate: 105.8, change: 0.45, changePercent: 0.43 },
  ],
}

export function MarketAnalysisTab() {
  const [marketData, setMarketData] = useState(mockMarketData)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      const updatedData = {
        ...marketData,
        indices: marketData.indices.map((index) => ({
          ...index,
          change: index.change + (Math.random() - 0.5) * 10,
          changePercent: index.changePercent + (Math.random() - 0.5) * 0.5,
        })),
      }
      setMarketData(updatedData)
      setLastUpdated(new Date())
      setIsRefreshing(false)
    }, 1000)
  }

  const getChangeColor = (change) => (change >= 0 ? "text-green-400" : "text-red-400")
  const getChangeIcon = (change) =>
    change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />

  return (
    <>
      <GoldForecastCard limit={60} />
      <div className="mt-4 mb-6 text-xs text-gray-500 border-l-2 border-amber-300 pl-3">
        The gold forecast above comes from the trained Prophet model. The index, stock,
        commodity and currency figures below are illustrative sample data — this build has
        no live market feed connected.
      </div>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Know Your Market</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Market Indices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Indices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketData.indices.map((index, i) => (
              <div key={i} className="p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm">{index.name}</h3>
                  <Badge variant={index.change >= 0 ? "default" : "destructive"}>
                    {index.change >= 0 ? "+" : ""}
                    {formatNumber(index.changePercent)}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formatNumber(index.value)}</p>
                  <div className={`flex items-center gap-1 text-sm ${getChangeColor(index.change)}`}>
                    {getChangeIcon(index.change)}
                    <span>
                      {index.change >= 0 ? "+" : ""}
                      {formatNumber(index.change)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Stocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 10 NSE Stocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {marketData.topStocks.map((stock, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border bg-gray-800 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-black bg-white rounded-full">
  {stock.symbol.substring(0, 2)}
</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{stock.symbol}</p>
                    <p className="text-sm text-muted-foreground text-gray-200">NSE</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">₹{formatNumber(stock.price)}</p>
                  <div className={`flex items-center gap-1 text-sm ${getChangeColor(stock.change)}`}>
                    {getChangeIcon(stock.change)}
                    <span>
                      {stock.change >= 0 ? "+" : ""}
                      {formatNumber(stock.change)} ({stock.changePercent >= 0 ? "+" : ""}
                      {formatNumber(stock.changePercent)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commodities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Commodities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketData.commodities.map((commodity, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{commodity.name}</p>
                    <p className="text-sm text-muted-foreground">{commodity.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{formatNumber(commodity.price)}</p>
                    <div
                      className={`flex items-center gap-1 text-sm ${getChangeColor(
                        commodity.change
                      )}`}
                    >
                      {getChangeIcon(commodity.change)}
                      <span>
                        {commodity.change >= 0 ? "+" : ""}
                        {formatNumber(commodity.change)} ({commodity.changePercent >= 0 ? "+" : ""}
                        {formatNumber(commodity.changePercent)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Currency Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketData.currencies.map((currency, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{currency.pair}</p>
                    <p className="text-sm text-muted-foreground">Exchange Rate</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{formatNumber(currency.rate)}</p>
                    <div
                      className={`flex items-center gap-1 text-sm ${getChangeColor(
                        currency.change
                      )}`}
                    >
                      {getChangeIcon(currency.change)}
                      <span>
                        {currency.change >= 0 ? "+" : ""}
                        {formatNumber(currency.change)} ({currency.changePercent >= 0 ? "+" : ""}
                        {formatNumber(currency.changePercent)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Market Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">847</p>
              <p className="text-sm text-muted-foreground">Gainers</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">623</p>
              <p className="text-sm text-muted-foreground">Decliners</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">156</p>
              <p className="text-sm text-muted-foreground">Unchanged</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  )
}
