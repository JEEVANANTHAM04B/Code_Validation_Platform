import { ClientOnly } from "@tanstack/react-router";
import Editor from "@monaco-editor/react";

import { Skeleton } from "@/components/ui/skeleton";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "python" | "sql";
  height?: number;
}

export function CodeEditor({ value, onChange, language, height = 420 }: CodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[oklch(0.17_0.02_258)]">
      <ClientOnly fallback={<Skeleton className="w-full" style={{ height }} />}>
        <Editor
          height={height}
          language={language}
          theme="vs-dark"
          value={value}
          onChange={(next) => onChange(next ?? "")}
          options={{
            fontSize: 14,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            tabSize: language === "python" ? 4 : 2,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 14, bottom: 14 },
            smoothScrolling: true,
            renderLineHighlight: "gutter",
          }}
        />
      </ClientOnly>
    </div>
  );
}
