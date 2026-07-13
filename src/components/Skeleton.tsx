"use client";

export function SkeletonBox({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-bg-hover/60 rounded-lg animate-pulse ${className}`} style={style} />;
}

export function SkeletonHome() {
  return (
    <div className="space-y-8">
      <div className="pt-8">
        <SkeletonBox className="h-9 w-40" />
        <SkeletonBox className="h-5 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonBox className="h-24 rounded-xl" />
        <SkeletonBox className="h-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonBox className="h-20 rounded-xl" />
        <SkeletonBox className="h-20 rounded-xl" />
      </div>
      <div className="space-y-2">
        <SkeletonBox className="h-6 w-32" />
        <SkeletonBox className="h-16 rounded-lg" />
        <SkeletonBox className="h-16 rounded-lg" />
        <SkeletonBox className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonNotes() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBox key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <div className="flex gap-2 w-full max-w-lg">
        <SkeletonBox className="h-8 w-16 rounded-lg" />
        <SkeletonBox className="h-8 w-16 rounded-lg" />
        <SkeletonBox className="h-8 w-16 rounded-lg" />
      </div>
      <SkeletonBox className="w-full max-w-lg rounded-2xl" style={{ height: "min(50vh, 350px)" }} />
      <SkeletonBox className="h-10 w-full max-w-lg rounded-lg" />
    </div>
  );
}
