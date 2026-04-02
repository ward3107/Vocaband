/**
 * Developer/debug panel to view tracked errors
 *
 * This component is hidden by default and can be accessed via:
 * 1. URL parameter: ?debug=true
 * 2. Console command: localStorage.setItem('vocaband_debug', 'true')
 *
 * Shows silent failures that occur during app usage for debugging.
 */

import { useState, useEffect } from 'react';
import { getTrackedErrors, clearTrackedErrors, type TrackedError } from '../../errorTracking';

export function ErrorTrackingPanel() {
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<TrackedError[]>([]);

  useEffect(() => {
    // Check if debug mode is enabled via URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const debugEnabled = urlParams.get('debug') === 'true' ||
                        localStorage.getItem('vocaband_debug') === 'true';

    if (debugEnabled) {
      setShow(true);
      // Load errors initially and set up refresh interval
      setErrors(getTrackedErrors());
      const interval = setInterval(() => {
        setErrors(getTrackedErrors());
      }, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  // Don't render anything if debug mode is off
  if (!show) return null;

  const severityColor = {
    low: 'text-gray-500',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };

  const categoryBadge = {
    database: 'bg-blue-100 text-blue-800',
    network: 'bg-orange-100 text-orange-800',
    authentication: 'bg-red-100 text-red-800',
    feature: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-md max-h-96 overflow-hidden z-[9999] font-mono text-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Error Tracking</h3>
        <button
          onClick={() => {
          clearTrackedErrors();
          setErrors([]);
        }}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Clear ({errors.length})
        </button>
      </div>

      {errors.length === 0 ? (
        <p className="text-gray-500">No errors tracked yet.</p>
      ) : (
        <div className="overflow-y-auto max-h-72 space-y-2">
          {errors.slice().reverse().map((error, idx) => (
            <div
              key={idx}
              className={`p-2 rounded border ${severityColor[error.severity].split(' ')[0].replace('text-', 'bg-').replace('500', '100').replace('600', '200')}`}
            >
              <div className="flex items-start gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${categoryBadge[error.category]}`}>
                  {error.category}
                </span>
                <span className={`font-semibold ${severityColor[error.severity]}`}>
                  {error.severity.toUpperCase()}
                </span>
              </div>
              <div className="mt-1 text-gray-700">{error.message}</div>
              {error.context && Object.keys(error.context).length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                    Context
                  </summary>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </details>
              )}
              <div className="mt-1 text-[10px] text-gray-400">
                {new Date(error.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
