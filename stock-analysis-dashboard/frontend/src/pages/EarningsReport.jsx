import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { earningsApi, aiApi } from '../services/api';

export default function EarningsReport() {
  const { ticker, date } = useParams();
  const [report, setReport] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('summary');
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportData, transcriptData, insightsData] = await Promise.allSettled([
        earningsApi.getReport(ticker, date),
        earningsApi.getTranscript(ticker, date),
        aiApi.getInsights(ticker, date),
      ]);

      if (reportData.status === 'fulfilled') setReport(reportData.value);
      if (transcriptData.status === 'fulfilled') setTranscript(transcriptData.value);
      if (insightsData.status === 'fulfilled' && insightsData.value?.insights) {
        setInsights(insightsData.value.insights);
      }
    } catch (err) {
      console.error('Failed to load earnings report:', err);
    } finally {
      setLoading(false);
    }
  }, [ticker, date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateInsights = async () => {
    setGeneratingInsights(true);
    try {
      await fetch('/api/ai/insights/' + ticker + '/' + date + '/generate', { method: 'POST' });
      // Poll for results
      setTimeout(async () => {
        try {
          const data = await aiApi.getInsights(ticker, date);
          if (data?.insights) setInsights(data.insights);
        } catch { /* insights may not be ready yet */ }
        setGeneratingInsights(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setGeneratingInsights(false);
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return d;
    }
  };

  const sections = ['summary', 'transcript', 'ai-insights'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={'/stock/' + ticker} className="text-surface-200/50 hover:text-white transition-colors">
          &larr; Back to {ticker}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">
          {ticker} Earnings Report
        </h1>
        <p className="text-sm text-surface-200/50 mt-1">{formatDate(date)}</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="card animate-pulse h-32" />
          <div className="card animate-pulse h-64" />
        </div>
      ) : (
        <>
          {/* Report summary */}
          {report ? (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-3">Financial Results</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {report.epsActual != null && (
                  <div>
                    <p className="text-xs text-surface-200/50">EPS Actual</p>
                    <p className="text-lg font-mono font-semibold text-white">${report.epsActual.toFixed(2)}</p>
                  </div>
                )}
                {report.epsEstimate != null && (
                  <div>
                    <p className="text-xs text-surface-200/50">EPS Estimate</p>
                    <p className="text-lg font-mono font-semibold text-surface-200/70">${report.epsEstimate.toFixed(2)}</p>
                  </div>
                )}
                {report.revenue != null && (
                  <div>
                    <p className="text-xs text-surface-200/50">Revenue</p>
                    <p className="text-lg font-mono font-semibold text-white">
                      ${(report.revenue / 1e9).toFixed(2)}B
                    </p>
                  </div>
                )}
                {report.surprise != null && (
                  <div>
                    <p className="text-xs text-surface-200/50">Surprise</p>
                    <p className={"text-lg font-mono font-semibold " + (report.surprise >= 0 ? 'text-gain' : 'text-loss')}>
                      {report.surprise >= 0 ? '+' : ''}{report.surprise.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-surface-200/50 text-sm">
                Earnings report data for {ticker} on {date} is not available yet.
              </p>
              <p className="text-xs text-surface-200/40 mt-1">
                Report data will appear once the earnings scraper processes this date.
              </p>
            </div>
          )}

          {/* Section tabs */}
          <div className="border-b border-surface-700">
            <div className="flex gap-1">
              {sections.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSection(s)}
                  className={"px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize " +
                    (activeSection === s
                      ? "border-brand-500 text-brand-400"
                      : "border-transparent text-surface-200/50 hover:text-white")}
                >
                  {s.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Section content */}
          <div>
            {activeSection === 'summary' && (
              <div className="card">
                {report ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-surface-200/70">
                      {ticker} reported earnings for the period ending {date}.
                      {report.epsActual != null && report.epsEstimate != null && (
                        report.epsActual >= report.epsEstimate
                          ? ' The company beat analyst expectations with an EPS of $' + report.epsActual.toFixed(2) + ' vs. estimated $' + report.epsEstimate.toFixed(2) + '.'
                          : ' The company missed analyst expectations with an EPS of $' + report.epsActual.toFixed(2) + ' vs. estimated $' + report.epsEstimate.toFixed(2) + '.'
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-surface-200/50 text-sm">No summary available.</p>
                )}
              </div>
            )}

            {activeSection === 'transcript' && (
              <div className="card">
                {transcript ? (
                  <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                    <p className="text-surface-200/70">{transcript}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-surface-200/50 text-sm">
                      Transcript not available yet.
                    </p>
                    <p className="text-xs text-surface-200/40 mt-1">
                      Transcripts are loaded once the earnings data scraper runs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'ai-insights' && (
              <div className="card">
                {insights ? (
                  <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                    <p className="text-surface-200/70">{typeof insights === 'string' ? insights : JSON.stringify(insights, null, 2)}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-surface-200/50 text-sm mb-4">
                      No AI insights generated for this earnings report yet.
                    </p>
                    <button
                      onClick={generateInsights}
                      disabled={generatingInsights}
                      className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      {generatingInsights ? 'Generating...' : 'Generate AI Insights'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
