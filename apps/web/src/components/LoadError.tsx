/** Показывается вместо секции, если API не ответил */
export function LoadError({ what }: { what: string }) {
  return (
    <div className="load-error" role="alert">
      <p className="load-error__title">Не удалось загрузить {what}</p>
      <p className="load-error__text">Попробуйте обновить страницу через минуту.</p>
    </div>
  );
}
