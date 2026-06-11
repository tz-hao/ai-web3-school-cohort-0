import type { AuditTimelineItem } from "@/types";

const defaultSteps = [
  "收到 Agent 支付请求",
  "支付意图已解析",
  "策略判断：允许执行",
  "已提交到 Cobo Agentic Wallet",
  "CAW Receipt 已生成",
  "交易已确认",
];

export function AuditTimeline({
  items,
  onClear,
}: {
  items: AuditTimelineItem[];
  onClear: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[#6B7280]">记录 Agent 支付意图、策略判断、人工确认与 CAW 执行结果。</p>
        <button
          onClick={onClear}
          className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#111827] transition hover:border-[#111827]"
        >
          清空
        </button>
      </div>

      {items.length === 0 ? (
        <div className="grid gap-3">
          {defaultSteps.map((step, index) => (
            <TimelineRow key={step} index={index + 1} title={step} description="等待支付请求" tone="neutral" details={[]} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.slice(0, 12).map((item, index) => (
            <TimelineRow
              key={`${item.auditId}-${item.id}`}
              index={index + 1}
              title={item.title}
              description={item.description}
              tone={item.tone}
              details={item.details}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  index,
  title,
  description,
  tone,
  details,
}: {
  index: number;
  title: string;
  description: string;
  tone: AuditTimelineItem["tone"] | "neutral";
  details: string[];
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${toneClassName(tone)}`}>
        {index}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#111827]">{title}</p>
        <p className="mt-1 break-words text-xs leading-5 text-[#6B7280]">{description}</p>
        {details.length ? (
          <div className="mt-2 grid gap-1">
            {details.map((detail) => (
              <p key={detail} className="break-words rounded-lg bg-[#F8F9FA] px-2 py-1 font-mono text-[11px] text-[#6B7280]">
                {detail}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toneClassName(tone: AuditTimelineItem["tone"] | "neutral") {
  if (tone === "danger") return "bg-[#FEF2F2] text-[#B91C1C]";
  if (tone === "warning") return "bg-[#FFFBEB] text-[#B45309]";
  if (tone === "success") return "bg-[#ECFDF5] text-[#047857]";
  if (tone === "info") return "bg-[#EFF6FF] text-[#1D4ED8]";
  return "bg-[#F8F9FA] text-[#6B7280]";
}
