type SectionHeadingProps = {
  kicker: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  const alignment =
    align === "center"
      ? "mx-auto max-w-2xl text-center items-center"
      : "max-w-2xl";

  return (
    <div className={`flex flex-col gap-4 ${alignment}`}>
      <p className="section-kicker">{kicker}</p>
      <h2 className="font-display text-4xl font-semibold leading-none tracking-[-0.03em] text-ink sm:text-5xl">
        {title}
      </h2>
      <p className="text-base leading-7 text-ink/70 sm:text-lg">{description}</p>
    </div>
  );
}
