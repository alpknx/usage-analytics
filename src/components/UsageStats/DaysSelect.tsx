"use client";

import * as Select from "@radix-ui/react-select";

interface DaysSelectProps {
  value: number;
  onChange: (days: number) => void;
}

const OPTIONS = [7, 14, 30, 90] as const;

export function DaysSelect({ value, onChange }: DaysSelectProps) {
  return (
    <Select.Root
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <Select.Trigger
        className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        aria-label="Select time period"
      >
        <Select.Value />
        <Select.Icon>
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="overflow-hidden rounded border border-gray-200 bg-white shadow-lg">
          <Select.Viewport className="p-1">
            {OPTIONS.map((opt) => (
              <Select.Item
                key={opt}
                value={String(opt)}
                className="cursor-pointer rounded px-3 py-1.5 text-sm text-gray-700 outline-none hover:bg-blue-50 data-[highlighted]:bg-blue-50"
              >
                <Select.ItemText>{opt} days</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
