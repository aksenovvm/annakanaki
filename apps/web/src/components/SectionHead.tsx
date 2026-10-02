type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  id?: string;
};

export function SectionHead({ eyebrow, title, subtitle, id }: Props) {
  return (
    <div className="section__head">
      <span className="section__eyebrow">{eyebrow}</span>
      <h2 className="section__title" id={id}>
        {title}
      </h2>
      {subtitle && <p className="section__subtitle">{subtitle}</p>}
    </div>
  );
}
