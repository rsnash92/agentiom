'use client';

import { useState } from 'react';
import {
  TabGroup,
  Fieldset,
  FormInput,
  FormSelect,
  CollapsibleSection,
  SegmentedControl,
  RadioGroup,
  Checkbox,
  RangeSlider,
  ActionButton,
  DualInputRow,
  DateTimeInput,
  InfoRow,
} from '@/components/ui/trading-form';

interface CreatePositionPanelProps {
  currentPrice?: number;
  symbol?: string;
  balance?: number;
}

const STRATEGIES = [
  { value: 'impact', label: 'Impact Minimization' },
  { value: 'twap', label: 'TWAP' },
  { value: 'vwap', label: 'VWAP' },
  { value: 'iceberg', label: 'Iceberg' },
];

const URGENCY_OPTIONS = [
  { value: 'very_low', label: 'Very Low' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very High' },
];

const PRICE_OPTIONS = [
  { value: 'mid', label: 'Mid' },
  { value: 'bid', label: 'Bid' },
  { value: 'pct', label: '↓1%' },
];

export function CreatePositionPanel({
  currentPrice = 89319.5,
  symbol = 'BTC/USD',
  balance = 0,
}: CreatePositionPanelProps) {
  // Form state
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [baseAmount, setBaseAmount] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [strategy, setStrategy] = useState('impact');
  const [limitPrice, setLimitPrice] = useState('');
  const [priceType, setPriceType] = useState('mid');
  const [oolPause, setOolPause] = useState(false);
  const [entry, setEntry] = useState(false);
  const [duration, setDuration] = useState('5');
  const [timezone, setTimezone] = useState('Europe/London UTC+00:00');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Exit conditions
  const [takeProfitType, setTakeProfitType] = useState('%');
  const [takeProfitValue, setTakeProfitValue] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [takeProfitUrgency, setTakeProfitUrgency] = useState('high');
  const [stopLossType, setStopLossType] = useState('%');
  const [stopLossValue, setStopLossValue] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [stopLossUrgency, setStopLossUrgency] = useState('high');

  const baseCoin = symbol.split('/')[0];
  const quoteCoin = 'USDT';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Account & Direction */}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <FormSelect
            label="Accounts"
            value="default"
            options={[{ value: 'default', label: 'Accounts' }]}
          />
          <TabGroup
            tabs={[
              { value: 'buy', label: 'Buy', variant: 'success' },
              { value: 'sell', label: 'Sell', variant: 'error' },
            ]}
            value={direction}
            onChange={(v) => setDirection(v as 'buy' | 'sell')}
            className="w-[180px]"
          />
        </div>

        {/* Amount Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <FormInput
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              placeholder={baseCoin}
            />
            <div className="relative h-1 bg-border/40 rounded-full">
              <RangeSlider value={0} onChange={() => {}} min={0} max={100} showTicks />
            </div>
            <div className="text-xs text-foreground-muted text-center mt-1">
              ≡ 0.00 {baseCoin}
            </div>
          </div>
          <div className="space-y-1">
            <FormInput
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              placeholder={quoteCoin}
            />
            <div className="relative h-1 bg-border/40 rounded-full">
              <RangeSlider value={0} onChange={() => {}} min={0} max={100} showTicks />
            </div>
            <div className="text-xs text-foreground-muted text-center mt-1">
              ≡ 0.00 {quoteCoin}
            </div>
          </div>
        </div>

        {/* Strategy */}
        <Fieldset label="Strategy">
          <FormSelect
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            options={STRATEGIES}
          />
        </Fieldset>

        {/* Limit Price */}
        <Fieldset label="Limit Price">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="flex-1 bg-transparent text-sm font-mono focus:outline-none"
              placeholder=""
            />
            <div className="flex items-center gap-1">
              <button className="p-1 text-foreground-muted hover:text-foreground">
                <SortIcon className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 bg-background-secondary text-xs rounded">Dynamic</span>
            </div>
          </div>
        </Fieldset>

        {/* Price Type & Options */}
        <div className="flex items-center gap-4">
          <RadioGroup
            name="priceType"
            options={PRICE_OPTIONS}
            value={priceType}
            onChange={setPriceType}
          />
          <Checkbox label="OOL Pause" checked={oolPause} onChange={setOolPause} />
          <Checkbox label="Entry" checked={entry} onChange={setEntry} />
        </div>

        {/* Duration & Timezone */}
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Duration (min)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <FormSelect
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            options={[
              { value: 'Europe/London UTC+00:00', label: 'Europe/London UTC+00:00' },
              { value: 'America/New_York UTC-05:00', label: 'America/New_York UTC-05:00' },
              { value: 'Asia/Tokyo UTC+09:00', label: 'Asia/Tokyo UTC+09:00' },
            ]}
          />
        </div>

        {/* Time Start/End */}
        <div className="grid grid-cols-2 gap-3">
          <DateTimeInput
            label="Time Start (Europe/London)"
            value={startTime}
            onChange={setStartTime}
          />
          <DateTimeInput
            label="Time End (Europe/London)"
            value={endTime}
            onChange={setEndTime}
          />
        </div>

        {/* Exit Conditions */}
        <CollapsibleSection title="Exit Conditions">
          {/* Take Profit */}
          <Fieldset label="Take Profit" className="mb-4">
            <DualInputRow
              leftLabel="Take Profit %"
              leftValue={takeProfitValue}
              leftOnChange={setTakeProfitValue}
              leftSuffix="%"
              rightLabel="Take Profit Price"
              rightValue={takeProfitPrice}
              rightOnChange={setTakeProfitPrice}
              rightSuffix="$"
            />
            <div className="flex justify-between text-xs text-foreground-muted mt-2">
              <span>N/A Max Profit</span>
              <span>N/A Chance of 24h Fill</span>
            </div>
            <div className="mt-3">
              <div className="text-xs text-foreground-muted mb-2">Urgency</div>
              <SegmentedControl
                options={URGENCY_OPTIONS}
                value={takeProfitUrgency}
                onChange={setTakeProfitUrgency}
              />
            </div>
          </Fieldset>

          {/* Stop Loss */}
          <Fieldset label="Stop Loss">
            <DualInputRow
              leftLabel="Stop Loss %"
              leftValue={stopLossValue}
              leftOnChange={setStopLossValue}
              leftSuffix="%"
              rightLabel="Stop Loss Price"
              rightValue={stopLossPrice}
              rightOnChange={setStopLossPrice}
              rightSuffix="$"
            />
            <div className="flex justify-between text-xs text-foreground-muted mt-2">
              <span>N/A Max Loss</span>
              <span>N/A Chance of 24h Fill</span>
            </div>
            <div className="mt-3">
              <div className="text-xs text-foreground-muted mb-2">Urgency</div>
              <SegmentedControl
                options={URGENCY_OPTIONS}
                value={stopLossUrgency}
                onChange={setStopLossUrgency}
              />
            </div>
          </Fieldset>
        </CollapsibleSection>

        {/* Scale Orders */}
        <CollapsibleSection title="Scale Orders">
          <Fieldset label="Parameters" className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <span className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center text-primary">AI</span>
              <span className="font-medium">Pre-Trade Analytics</span>
            </div>
            <InfoRow label="Participation Rate" value="-" />
            <InfoRow label="Order Volatility" value="-" />
            <InfoRow label="Market Volume" value="-" />
          </Fieldset>
        </CollapsibleSection>

        {/* Templates */}
        <div className="grid grid-cols-2 gap-3">
          <ActionButton variant="outline">Save Templates</ActionButton>
          <ActionButton variant="outline">Load Templates</ActionButton>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="p-4 border-t border-border/40 space-y-2">
        <ActionButton
          variant={direction === 'buy' ? 'success' : 'error'}
          disabled={!baseAmount && !quoteAmount}
        >
          Submit {direction === 'buy' ? 'Buy' : 'Sell'} Order
        </ActionButton>
        <ActionButton variant="outline" className="!text-success border-success/50">
          Confirmation
        </ActionButton>
      </div>
    </div>
  );
}

// Icons
function SortIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
    </svg>
  );
}
