import { Button } from "./Button";

export const PAGE_SIZE = 12;

/** "Show more" under a paginated list; hidden once every page is loaded. */
export function LoadMore({ query }: { query: { status: string; loadMore: (n: number) => void } }) {
  if (query.status === "Exhausted" || query.status === "LoadingFirstPage") return null;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <Button loading={query.status === "LoadingMore"} onClick={() => query.loadMore(PAGE_SIZE)}>
        Show more
      </Button>
    </div>
  );
}
