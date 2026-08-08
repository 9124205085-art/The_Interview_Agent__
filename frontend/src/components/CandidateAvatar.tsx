import { cartoonAvatarUrl } from "@/lib/candidateProfile";

type CandidateAvatarProps = {
  seed: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export function CandidateAvatar({
  seed,
  name,
  size = "md",
  className = "",
}: CandidateAvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cartoonAvatarUrl(seed)}
      alt={`${name} avatar`}
      className={`rounded-full border-2 border-white bg-slate-100 object-cover shadow-md ring-2 ring-slate-200 ${sizeClasses[size]} ${className}`}
    />
  );
}
