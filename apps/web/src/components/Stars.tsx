import { StarIcon } from "./Icons";

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="stars" role="img" aria-label={`Оценка ${rating} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? undefined : "stars__off"}>
          <StarIcon size={size} />
        </span>
      ))}
    </span>
  );
}
