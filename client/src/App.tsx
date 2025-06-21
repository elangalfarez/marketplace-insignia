
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useCallback } from 'react';
import { Search, TrendingUp, Users, Star, BarChart3, AlertTriangle, CheckCircle, Clock, ShoppingBag } from 'lucide-react';
import type { SearchInput, AnalysisResult, Platform, Sentiment, Priority } from '../../server/src/schema';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['shopee']);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'started' | 'in_progress' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const platformOptions: { value: Platform; label: string; emoji: string }[] = [
    { value: 'shopee', label: 'Shopee', emoji: '🛍️' },
    { value: 'tiktok_shop', label: 'TikTok Shop', emoji: '🎵' },
    { value: 'tokopedia', label: 'Tokopedia', emoji: '🛒' }
  ];

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatforms((prev: Platform[]) => {
      if (prev.includes(platform)) {
        return prev.filter((p: Platform) => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const pollSessionStatus = useCallback(async (currentSessionId: string) => {
    try {
      const status = await trpc.getSessionStatus.query({ session_id: currentSessionId });
      setSearchStatus(status.status);
      setProgress(status.progress);
      setStatusMessage(status.message || '');

      if (status.status === 'completed') {
        const analysis = await trpc.getAnalysis.query({ session_id: currentSessionId });
        setAnalysisResult(analysis);
        setIsSearching(false);
      } else if (status.status === 'failed') {
        setError(status.message || 'Analysis failed');
        setIsSearching(false);
      } else if (status.status === 'in_progress' || status.status === 'started') {
        setTimeout(() => pollSessionStatus(currentSessionId), 2000);
      }
    } catch (error) {
      console.error('Failed to poll session status:', error);
      setError('Failed to check analysis status');
      setIsSearching(false);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || selectedPlatforms.length === 0) return;

    setIsSearching(true);
    setError(null);
    setAnalysisResult(null);
    setSearchStatus('idle');
    setProgress(0);

    try {
      const searchInput: SearchInput = {
        query: searchQuery.trim(),
        platforms: selectedPlatforms
      };

      const response = await trpc.searchProducts.mutate(searchInput);
      setSearchStatus(response.status);
      
      if (response.status === 'started' || response.status === 'in_progress') {
        pollSessionStatus(response.session_id);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to start product search');
      setIsSearching(false);
    }
  };

  const getSentimentColor = (sentiment: Sentiment): string => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      case 'neutral': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Marketplace Insignia
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            🚀 Analyze products across Shopee, TikTok Shop, and Tokopedia. Get insights from reviews, 
            sentiment analysis, and actionable recommendations to boost your business! ✨
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Search Products
            </CardTitle>
            <CardDescription>
              Enter a product keyword or paste a direct product URL to start analyzing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Search Query</label>
                <Input
                  placeholder="e.g., 'wireless headphones' or paste product URL"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="text-lg p-6"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Select Platforms (choose at least one)</label>
                <div className="flex flex-wrap gap-3">
                  {platformOptions.map((platform) => (
                    <Button
                      key={platform.value}
                      type="button"
                      variant={selectedPlatforms.includes(platform.value) ? "default" : "outline"}
                      onClick={() => handlePlatformChange(platform.value)}
                      className="flex items-center gap-2 h-12 px-6"
                    >
                      <span className="text-lg">{platform.emoji}</span>
                      {platform.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSearching || !searchQuery.trim() || selectedPlatforms.length === 0}
                className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isSearching ? '🔍 Analyzing Products...' : '🚀 Start Analysis'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Progress/Status */}
        {isSearching && (
          <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="font-medium">
                    {searchStatus === 'started' && '🚀 Starting product search...'}
                    {searchStatus === 'in_progress' && '🔍 Scraping reviews and analyzing...'}
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-gray-600">{statusMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mb-8 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Total Products</p>
                      <p className="text-3xl font-bold">{analysisResult.summary.total_products}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Total Reviews</p>
                      <p className="text-3xl font-bold">{analysisResult.summary.total_reviews.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100">Average Rating</p>
                      <p className="text-3xl font-bold">{analysisResult.summary.average_rating.toFixed(1)} ⭐</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Insights Ready</p>
                      <p className="text-3xl font-bold">✨ {analysisResult.recommendations.length}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Analysis Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 h-12">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Keywords
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recommendations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Sentiment Distribution */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Sentiment Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {analysisResult.summary.sentiment_distribution.positive}
                        </div>
                        <div className="text-sm text-green-700">😊 Positive</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-600">
                          {analysisResult.summary.sentiment_distribution.neutral}
                        </div>
                        <div className="text-sm text-yellow-700">😐 Neutral</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                        <div className="text-2xl font-bold text-red-600">
                          {analysisResult.summary.sentiment_distribution.negative}
                        </div>
                        <div className="text-sm text-red-700">😞 Negative</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <div className="grid gap-6">
                  {analysisResult.products.map((product) => (
                    <Card key={product.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <Badge variant="outline" className="capitalize">
                                {platformOptions.find(p => p.value === product.platform)?.emoji} {product.platform}
                              </Badge>
                              {product.average_rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{product.average_rating.toFixed(1)}</span>
                                </div>
                              )}
                              <span>{product.total_reviews} reviews</span>
                            </div>
                          </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Scraped: {product.scraped_at.toLocaleDateString()}</span>
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View Product →
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      Top Keywords & Frequency
                    </CardTitle>
                    <CardDescription>
                      Most mentioned words and phrases in customer reviews
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {analysisResult.keywords
                        .sort((a, b) => b.frequency - a.frequency)
                        .slice(0, 15)
                        .map((keyword) => (
                          <div key={keyword.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{keyword.keyword}</span>
                              {keyword.sentiment && (
                                <Badge className={getSentimentColor(keyword.sentiment)}>
                                  {keyword.sentiment === 'positive' && '😊'}
                                  {keyword.sentiment === 'neutral' && '😐'}
                                  {keyword.sentiment === 'negative' && '😞'}
                                  {keyword.sentiment}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${Math.min((keyword.frequency / Math.max(...analysisResult.keywords.map(k => k.frequency))) * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-gray-700">{keyword.frequency}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-6">
                <div className="grid gap-4">
                  {analysisResult.recommendations
                    .sort((a, b) => {
                      const priorityOrder = { high: 3, medium: 2, low: 1 };
                      return priorityOrder[b.priority] - priorityOrder[a.priority];
                    })
                    .map((rec) => (
                      <Card key={rec.id} className={`border-0 shadow-lg ${getPriorityColor(rec.priority)} border-l-4`}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              {getPriorityIcon(rec.priority)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold">{rec.title}</h3>
                                <Badge className={getPriorityColor(rec.priority)}>
                                  {rec.priority} priority
                                </Badge>
                                <Badge variant="outline">{rec.category}</Badge>
                              </div>
                              <p className="text-gray-700 mb-3">{rec.description}</p>
                              <p className="text-xs text-gray-500">
                                Added: {rec.created_at.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500">
            🔥 Marketplace Insignia - Empowering e-commerce success through data-driven insights ✨
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
