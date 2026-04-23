import type { ReactNode } from 'react';

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="text-[18px] font-semibold" style={{ letterSpacing: -0.3 }}>{title}</div>
      {subtitle && (
        <div className="text-[12px] mt-[3px]" style={{ color: 'rgb(var(--fg-muted))' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      className="uppercase mt-2 mb-[10px]"
      style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: 'rgb(var(--fg-muted))' }}
    >
      {children}
    </div>
  );
}

export function Row({
  title, desc, control,
}: { title: string; desc?: string; control: ReactNode }) {
  return (
    <div
      className="flex items-center gap-4 py-[14px]"
      style={{ borderBottom: '1px solid rgb(var(--border-soft))' }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium">{title}</div>
        {desc && (
          <div className="text-[11.5px] mt-[2px]" style={{ color: 'rgb(var(--fg-muted))' }}>
            {desc}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

export function MiniToggle({
  value, onChange,
}: { value: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={value}
      tabIndex={0}
      className={onChange ? 'cursor-pointer' : ''}
      onClick={() => onChange?.(!value)}
      style={{
        width: 30,
        height: 18,
        borderRadius: 9,
        background: value ? 'rgb(var(--accent))' : 'rgb(var(--surface-hi))',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 14 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: value ? 'rgb(var(--accent-fg))' : 'rgb(var(--fg-muted))',
          transition: 'left 0.15s',
        }}
      />
    </div>
  );
}
