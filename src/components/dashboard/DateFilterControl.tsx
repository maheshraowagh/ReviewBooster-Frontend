import { useState, useEffect } from 'react';

export interface PeriodOption {
  key: string;
  label: string;
}

export interface DateFilterControlProps {
  periods: PeriodOption[];
  activePeriod: string;
  onPeriodChange: (period: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApplyCustom: (start: string, end: string) => void;
}

export function DateFilterControl({
  periods,
  activePeriod,
  onPeriodChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyCustom,
}: DateFilterControlProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [customMode, setCustomMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState(startDate || todayStr);
  const [localStart, setLocalStart] = useState(startDate || todayStr);
  const [localEnd, setLocalEnd] = useState(endDate || todayStr);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startDate) {
      setLocalStart(startDate);
      setSingleDate(startDate);
    }
    if (endDate) {
      setLocalEnd(endDate);
    }
  }, [startDate, endDate]);

  // Ensure 'custom' is in periods list if not present
  const allPeriods = periods.some((p) => p.key === 'custom')
    ? periods
    : [...periods, { key: 'custom', label: 'Custom' }];

  const handleSingleDateSelect = (val: string) => {
    setSingleDate(val);
    onStartDateChange(val);
    onEndDateChange(val);
    setError(null);
    onApplyCustom(val, val);
  };

  const handleStartChange = (val: string) => {
    setLocalStart(val);
    onStartDateChange(val);
    validate(val, localEnd);
  };

  const handleEndChange = (val: string) => {
    setLocalEnd(val);
    onEndDateChange(val);
    validate(localStart, val);
  };

  const validate = (start: string, end: string) => {
    if (!start || !end) {
      setError('Please select both start and end dates.');
      return false;
    }
    if (start > end) {
      setError('Start date cannot be after end date.');
      return false;
    }
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays > 365) {
      setError('Maximum date range is 365 days.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleApply = () => {
    if (customMode === 'single') {
      onApplyCustom(singleDate, singleDate);
    } else if (validate(localStart, localEnd)) {
      onApplyCustom(localStart, localEnd);
    }
  };

  return (
    <div className="db-date-filter-wrapper">
      {/* Tab bar / Mobile select */}
      <div className="db-date-filter-bar">
        {/* Desktop tab buttons */}
        <div className="db-period-tabs" role="tablist" aria-label="Time period selector">
          {allPeriods.map(({ key, label }) => (
            <button
              key={key}
              id={`period-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={activePeriod === key}
              className={`db-period-btn${activePeriod === key ? ' active' : ''}`}
              onClick={() => onPeriodChange(key)}
            >
              {key === 'custom' && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                  style={{ marginRight: 6, verticalAlign: '-2px' }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Mobile dropdown selector */}
        <select
          className="db-period-select"
          value={activePeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          aria-label="Select period"
        >
          {allPeriods.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Date Range Panel */}
      {activePeriod === 'custom' && (
        <div className="db-custom-date-panel animate-fade-in">
          {/* Mode Switcher */}
          <div className="db-custom-mode-switch">
            <button
              type="button"
              className={`db-mode-btn${customMode === 'single' ? ' active' : ''}`}
              onClick={() => setCustomMode('single')}
            >
              Single Date
            </button>
            <button
              type="button"
              className={`db-mode-btn${customMode === 'range' ? ' active' : ''}`}
              onClick={() => setCustomMode('range')}
            >
              Date Range
            </button>
          </div>

          {customMode === 'single' ? (
            <div className="db-custom-date-inputs">
              <div className="db-date-field">
                <label htmlFor="db-single-date">Select Date</label>
                <input
                  id="db-single-date"
                  type="date"
                  className="db-date-input"
                  value={singleDate}
                  max={todayStr}
                  onChange={(e) => handleSingleDateSelect(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="db-custom-date-inputs">
              <div className="db-date-field">
                <label htmlFor="db-start-date">From</label>
                <input
                  id="db-start-date"
                  type="date"
                  className="db-date-input"
                  value={localStart}
                  max={todayStr}
                  onChange={(e) => handleStartChange(e.target.value)}
                />
              </div>
              <div className="db-date-field">
                <label htmlFor="db-end-date">To</label>
                <input
                  id="db-end-date"
                  type="date"
                  className="db-date-input"
                  value={localEnd}
                  max={todayStr}
                  onChange={(e) => handleEndChange(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="db-date-apply-btn"
                onClick={handleApply}
                disabled={Boolean(error)}
              >
                Apply Filter
              </button>
            </div>
          )}
          {error && <p className="db-date-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
