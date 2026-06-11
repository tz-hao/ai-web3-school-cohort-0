const examples = [
  "支付 0.001 SETH 给 数据 API 服务商",
  "支付 0.005 SETH 给 AI 推理服务",
  "支付 0.01 SETH 给 链上分析 API",
  "支付 0.05 SETH 给 高级研究数据源",
];

export function ChatBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-32 w-full resize-none rounded-xl border border-[#E5E7EB] bg-white p-4 font-mono text-sm leading-6 text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#111827]"
        aria-label="Agent payment request"
        placeholder="支付 0.001 SETH 给 数据 API 服务商"
      />

      <div className="grid gap-2">
        {examples.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onChange(prompt)}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-left text-xs leading-5 text-[#6B7280] transition hover:border-[#111827] hover:text-[#111827]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <button
        onClick={onSubmit}
        className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
      >
        分析支付请求
      </button>
    </div>
  );
}
