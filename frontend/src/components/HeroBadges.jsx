const schoolTags = ['#NextGen', '#GlobalTechnopreneur'];

export default function HeroBadges({ tags = schoolTags }) {
  return <div data-hero-badges className="flex flex-wrap items-center gap-1">
    {tags.map(tag => <span key={tag} className="inline-block whitespace-nowrap rounded-full border border-primary/25 bg-white px-2 py-1 text-[10px] font-bold tracking-wide text-primary">{tag}</span>)}
  </div>;
}
