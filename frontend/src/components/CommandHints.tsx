interface Props {
  onCommand: (text: string) => void;
}

const COMMANDS = [
  "Analyze my system",
  "How's my performance?",
  "What is a black hole?",
  "Explain quantum computing",
  "Give me a productivity tip",
  "Tell me a joke",
  "Open YouTube",
  "What is 24 * 18?",
];

export default function CommandHints({ onCommand }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {COMMANDS.map((c) => (
        <button
          key={c}
          onClick={() => onCommand(c)}
          className="rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1 text-[11px] text-cyan-200/90 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:text-glow"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
