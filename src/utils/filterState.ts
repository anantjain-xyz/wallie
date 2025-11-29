import { useSearchParams } from "react-router-dom";

export interface FilterState {
  orderBy: string;
  orderDirection: `asc` | `desc`;
  status?: string[];
  priority?: string[];
  estimate?: (number | null)[];
  query?: string;
}

export function getFilterStateFromSearchParams(
  searchParams: URLSearchParams,
): FilterState {
  const orderBy = searchParams.get(`orderBy`) ?? `priority`;
  const orderDirection =
    (searchParams.get(`orderDirection`) as `asc` | `desc`) ?? `desc`;
  const status = searchParams
    .getAll(`status`)
    .map((status) => status.toLocaleLowerCase().split(`,`))
    .flat();
  const priority = searchParams
    .getAll(`priority`)
    .map((status) => status.toLocaleLowerCase().split(`,`))
    .flat();
  const estimate = searchParams
    .getAll(`estimate`)
    .map((est) =>
      est.split(`,`).map((val) => (val === "null" ? null : Number(val))),
    )
    .flat()
    .filter((est) => est === null || !isNaN(est as number));
  const query = searchParams.get(`query`);

  const state = {
    orderBy,
    orderDirection,
    status,
    priority,
    estimate,
    query: query || undefined,
  };

  return state;
}

export function useFilterState(): [
  FilterState,
  (state: Partial<FilterState>) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = getFilterStateFromSearchParams(searchParams);

  const setState = (state: Partial<FilterState>) => {
    const { orderBy, orderDirection, status, priority, estimate, query } =
      state;
    setSearchParams((searchParams) => {
      if (orderBy) {
        searchParams.set(`orderBy`, orderBy);
      } else {
        searchParams.delete(`orderBy`);
      }
      if (orderDirection) {
        searchParams.set(`orderDirection`, orderDirection);
      } else {
        searchParams.delete(`orderDirection`);
      }
      if (status && status.length > 0) {
        searchParams.set(`status`, status.join(`,`));
      } else {
        searchParams.delete(`status`);
      }
      if (priority && priority.length > 0) {
        searchParams.set(`priority`, priority.join(`,`));
      } else {
        searchParams.delete(`priority`);
      }
      if (estimate && estimate.length > 0) {
        searchParams.set(
          `estimate`,
          estimate.map((e) => (e === null ? "null" : e)).join(`,`),
        );
      } else {
        searchParams.delete(`estimate`);
      }
      if (query) {
        searchParams.set(`query`, query);
      } else {
        searchParams.delete(`query`);
      }
      return searchParams;
    });
  };

  return [state, setState];
}
